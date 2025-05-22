import { ControllerRenderProps, FieldValues } from 'react-hook-form'
import * as z from 'zod/v4'
import { INPUT_COMPONENTS } from './config'

export type FieldConfigItem = {
  description?: React.ReactNode
  label?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement> & {
    showLabel?: boolean
  }
  fieldType?:
    | keyof typeof INPUT_COMPONENTS
    | React.FC<AutoFormInputComponentProps>

  renderParent?: (props: {
    children: React.ReactNode
  }) => React.ReactElement | null
}

export type FieldConfig<SchemaType = any> = {
  // Simplified type definition that works with Zod v4
  [Key in keyof SchemaType]?: SchemaType[Key] extends object
    ? FieldConfig<SchemaType[Key]>
    : FieldConfigItem
}

export enum DependencyType {
  DISABLES,
  REQUIRES,
  HIDES,
  SETS_OPTIONS
}

type BaseDependency<SchemaType = any> = {
  sourceField: keyof SchemaType
  type: DependencyType
  targetField: keyof SchemaType
  when: (sourceFieldValue: any, targetFieldValue: any) => boolean
}

export type ValueDependency<SchemaType = any> = BaseDependency<SchemaType> & {
  type: DependencyType.DISABLES | DependencyType.REQUIRES | DependencyType.HIDES
}

export type EnumValues = readonly [string, ...string[]]

export type OptionsDependency<SchemaType = any> = BaseDependency<SchemaType> & {
  type: DependencyType.SETS_OPTIONS

  // Partial array of values from sourceField that will trigger the dependency
  options: EnumValues
}

export type Dependency<SchemaType = any> =
  | ValueDependency<SchemaType>
  | OptionsDependency<SchemaType>

/**
 * A FormInput component can handle a specific Zod type (e.g. "ZodBoolean")
 */
export type AutoFormInputComponentProps = {
  zodInputProps: React.InputHTMLAttributes<HTMLInputElement>
  field: ControllerRenderProps<FieldValues, any>
  fieldConfigItem: FieldConfigItem
  label: string
  isRequired: boolean
  fieldProps: any
  zodItem: z.ZodType
  className?: string
}
