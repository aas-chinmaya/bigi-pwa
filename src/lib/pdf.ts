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
    onclone: (clonedDocument, clonedElement) => {
      const normalizeColors = (element: HTMLElement) => {
        const styles = clonedDocument.defaultView?.getComputedStyle(element);
        if (styles?.borderColor.includes("oklch")) {
          element.style.borderColor = "#d9e8e1";
        }
        if (styles?.outlineColor.includes("oklch")) {
          element.style.outlineColor = "transparent";
        }
      };
      normalizeColors(clonedElement);
      clonedElement.querySelectorAll<HTMLElement>("*").forEach(normalizeColors);
    },
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
