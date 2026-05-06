import jsPDF from 'jspdf'
import { formatRupiah } from './format'

export function downloadReceiptPDF(tx) {
  const items = tx.transaction_items || []
  const pageHeight = Math.max(120, 70 + items.length * 10)
  const doc = new jsPDF({ unit: 'mm', format: [80, pageHeight] })
  let y = 8

  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('WARUNG MIKAYLA', 40, y, { align: 'center' }); y += 5
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text('Kp. Lebaksiuh No.152, RT.05/RW.01/', 40, y, { align: 'center' }); y += 5
  doc.text('WA: 0831-1253-7506', 40, y, { align: 'center' }); y += 6

  doc.text(`No: #${tx.id.slice(0, 8).toUpperCase()}`, 5, y); y += 4
  doc.text(`Tgl: ${new Date(tx.created_at).toLocaleString('id-ID')}`, 5, y); y += 5

  doc.setLineDashPattern([1, 1], 0)
  doc.line(5, y, 75, y); y += 4

  items.forEach(item => {
    doc.text(item.product_name, 5, y); y += 4
    doc.text(`  ${item.quantity} x ${formatRupiah(item.product_price)}`, 5, y)
    doc.text(formatRupiah(item.subtotal), 75, y, { align: 'right' }); y += 5
  })

  doc.line(5, y, 75, y); y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', 5, y); doc.text(formatRupiah(tx.total_amount), 75, y, { align: 'right' }); y += 5
  doc.setFont('helvetica', 'normal')
  doc.text('BAYAR', 5, y); doc.text(formatRupiah(tx.payment_amount), 75, y, { align: 'right' }); y += 5
  doc.setFont('helvetica', 'bold')
  doc.text('KEMBALI', 5, y); doc.text(formatRupiah(tx.change_amount), 75, y, { align: 'right' }); y += 8
  doc.setLineDashPattern([1, 1], 0)
  doc.line(5, y, 75, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text('Terima kasih telah berbelanja!', 40, y, { align: 'center' })

  doc.save(`struk-${tx.id.slice(0, 8)}.pdf`)
}
