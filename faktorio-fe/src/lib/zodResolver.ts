import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers'
import {
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type Resolver,
  type ResolverError,
  type ResolverSuccess,
  appendErrors
} from 'react-hook-form'
import { z } from 'zod/v4'

/**
 * Determines if an error is a Zod error by checking for the presence of an issues array.
 *
 * 에러가 Zod 에러인지 issues 배열의 존재 여부를 확인하여 판단합니다.
 *
 * エラーがZodエラーであるかどうかを、issuesの配列の存在を確認して判断します。
 */
const isZodError = (error: unknown): error is z.core.$ZodError =>
  error !== null &&
  typeof error === 'object' &&
  'issues' in error &&
  Array.isArray((error as { issues?: unknown }).issues)

/**
 * Parses Zod validation errors into a format compatible with react-hook-form.
 *
 * Zod 유효성 검사 에러를 react-hook-form과 호환되는 형식으로 파싱합니다.
 *
 * Zodバリデーションエラーをreact-hook-formと互換性のある形式に解析します。
 *
 * @param {z.core.$ZodIssue[]} zodErrors - The array of Zod validation issues / Zod 유효성 검사 이슈 배열 / Zodバリデーションの問題の配列
 * @param {boolean} validateAllFieldCriteria - Whether to validate all field criteria / 모든 필드 기준을 검증할지 여부 / すべてのフィールド基準を検証するかどうか
 * @returns {Record<string, FieldError>} Formatted errors for react-hook-form / react-hook-form용 형식화된 에러 / react-hook-form用にフォーマットされたエラー
 */
function parseErrorSchema(
  zodErrors: z.core.$ZodIssue[],
  validateAllFieldCriteria: boolean
) {
  const errors: Record<string, FieldError> = {}
  for (; zodErrors.length; ) {
    const error = zodErrors[0]
    const { code, message, path } = error
    // Convert path to string
    // 경로를 문자열로 변환
    // パスを文字列に変換
    const _path = path.map((p) => String(p)).join('.')

    if (!errors[_path]) {
      // Handle invalid_union type errors
      // invalid_union 타입의 에러 처리
      // invalid_union タイプのエラー処理
      if (code === 'invalid_union') {
        const invalidUnionError = error as z.core.$ZodIssueInvalidUnion
        // Use the first issue from the first union error
        // 첫 번째 유니온 에러의 첫 번째 이슈 사용
        // 最初のユニオンエラーの最初の問題を使用
        const firstError = invalidUnionError.errors[0]?.[0]

        if (firstError) {
          errors[_path] = {
            message: firstError.message,
            type: firstError.code || 'validation_error'
          }
        }
      } else {
        errors[_path] = {
          message,
          type: code || 'validation_error'
        }
      }
    }

    // Add all union errors to the processing queue
    // 모든 유니온 에러를 처리 큐에 추가
    // すべてのユニオンエラーを処理キューに追加
    if (code === 'invalid_union') {
      const invalidUnionError = error as z.core.$ZodIssueInvalidUnion
      invalidUnionError.errors.forEach((unionErrors) =>
        unionErrors.forEach((e) => zodErrors.push(e))
      )
    }

    if (validateAllFieldCriteria) {
      const types = errors[_path]?.types
      const messages = types && code ? types[code] : undefined

      if (_path) {
        errors[_path] = appendErrors(
          _path,
          validateAllFieldCriteria,
          errors,
          code || 'validation_error',
          messages
            ? ([] as string[]).concat(messages as string[], message)
            : message
        ) as FieldError
      }
    }

    zodErrors.shift()
  }

  return errors
}

/**
 * Type definition for Zod parse context derived from the parse method's parameters.
 *
 * parse 메서드의 매개변수에서 파생된 Zod 파싱 컨텍스트에 대한 타입 정의입니다.
 *
 * parseメソッドのパラメータから派生したZod解析コンテキストの型定義です。
 */
type ParseContext = Parameters<z.ZodType['parse']>[1]

export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions?: {
    mode?: 'async' | 'sync'
    raw?: false
  }
): Resolver<Input, Context, Output>

export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions?: {
    mode?: 'async' | 'sync'
    raw: true
  }
): Resolver<Input, Context, Input>

/**
 * Creates a resolver function for react-hook-form that validates form data using a Zod schema.
 *
 * Zod 스키마를 사용하여 폼 데이터를 검증하는 react-hook-form용 리졸버 함수를 생성합니다.
 *
 * Zodスキーマを使用してフォームデータを検証するreact-hook-form用のリゾルバー関数を作成します。
 *
 * @param {z.ZodSchema<Output>} schema - The Zod schema used to validate the form data / 폼 데이터 검증에 사용되는 Zod 스키마 / フォームデータの検証に使用されるZodスキーマ
 * @param {ParseContext} [schemaOptions] - Optional configuration options for Zod parsing / Zod 파싱을 위한 선택적 구성 옵션 / Zod解析のためのオプション設定
 * @param {Object} [resolverOptions] - Optional resolver-specific configuration / 리졸버 특정 선택적 구성 / リゾルバー特有のオプション設定
 * @param {('async'|'sync')} [resolverOptions.mode='async'] - Validation mode. Use 'sync' for synchronous validation / 검증 모드. 동기 검증에는 'sync' 사용 / 検証モード。同期検証には'sync'を使用
 * @param {boolean} [resolverOptions.raw=false] - If true, returns the raw form values instead of the parsed data / true인 경우 파싱된 데이터 대신 원시 폼 값 반환 / trueの場合、解析されたデータではなく生のフォーム値を返す
 * @returns {Resolver<z.output<typeof schema>>} A resolver function compatible with react-hook-form / react-hook-form과 호환되는 리졸버 함수 / react-hook-formと互換性のあるリゾルバー関数
 * @throws {Error} Throws if validation fails with a non-Zod error / Zod 에러가 아닌 검증 실패 시 에러 발생 / Zodエラーではない検証失敗時にエラーを投げる
 */
export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions: {
    mode?: 'async' | 'sync'
    raw?: boolean
  } = {}
): Resolver<Input, Context, Output | Input> {
  return async (values: Input, _, options) => {
    try {
      const data = await schema[
        resolverOptions.mode === 'sync' ? 'parse' : 'parseAsync'
      ](values, schemaOptions)

      options.shouldUseNativeValidation && validateFieldsNatively({}, options)

      return {
        errors: {} as FieldErrors,
        values: resolverOptions.raw ? Object.assign({}, values) : data
      } satisfies ResolverSuccess<Output | Input>
    } catch (error) {
      if (isZodError(error)) {
        return {
          values: {},
          errors: toNestErrors(
            parseErrorSchema(
              error.issues,
              !options.shouldUseNativeValidation &&
                options.criteriaMode === 'all'
            ),
            options
          )
        } satisfies ResolverError<Input>
      }

      throw error
    }
  }
}
