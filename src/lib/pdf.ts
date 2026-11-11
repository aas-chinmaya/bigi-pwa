/** Download the invoice sheet DOM node as a multi-page A4 PDF */
export async function downloadInvoicePdf(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = 210;
  const pageH = 297;
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.92);
  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(img, "JPEG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 1) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
