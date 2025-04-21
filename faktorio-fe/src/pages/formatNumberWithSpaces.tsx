export const formatNumberWithSpaces = (number: number | undefined) => {
  if (number === undefined) {
    return '0'
  }
  return number
    .toFixed(2)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
