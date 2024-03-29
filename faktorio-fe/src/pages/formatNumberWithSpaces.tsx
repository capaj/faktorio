export const formatNumberWithSpaces = (number: number | undefined) => {
  if (number === undefined) {
    return '0'
  }
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
