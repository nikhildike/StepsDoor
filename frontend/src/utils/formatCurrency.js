export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatSalaryRange(min, max) {
  if (!min && !max) return 'Salary not disclosed'
  if (!max) return `${formatINR(min)}+`
  return `${formatINR(min)} – ${formatINR(max)}`
}
