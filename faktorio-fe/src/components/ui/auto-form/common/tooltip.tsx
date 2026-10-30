function AutoFormTooltip({ fieldConfigItem }: { fieldConfigItem: any }) {
  return (
    <>
      {fieldConfigItem?.description && (
        <p className="text-sm text-fg-muted dark:text-white">
          {fieldConfigItem.description}
        </p>
      )}
    </>
  )
}

export default AutoFormTooltip
