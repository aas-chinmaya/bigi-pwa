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
      const colorCanvas = clonedDocument.createElement("canvas");
      const colorContext = colorCanvas.getContext("2d");
      const toSrgb = (color: string) => {
        if (!colorContext) return "#000000";
        colorContext.fillStyle = "#000000";
        colorContext.fillStyle = color;
        const normalized = colorContext.fillStyle;
        return typeof normalized === "string" ? normalized : "#000000";
      };
      const normalizeColors = (element: HTMLElement) => {
        const styles = clonedDocument.defaultView?.getComputedStyle(element);
        if (!styles) return;

        const declarations: { property: string; value: string }[] = [];
        for (let index = 0; index < styles.length; index++) {
          const property = styles.item(index);
          const value = styles.getPropertyValue(property);
          if (/oklch\(/i.test(value)) declarations.push({ property, value });
        }
        for (const { property, value } of declarations) {
          element.style.setProperty(
            property,
            value.replace(/oklch\([^)]*\)/gi, (color) => toSrgb(color))
          );
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
