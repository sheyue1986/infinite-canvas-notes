import { PDFDocument } from "pdf-lib";
import PptxGenJS from "pptxgenjs";

export async function makeSlidePdf(slides) {
  const document = await PDFDocument.create();
  for (const slide of slides) {
    const image = await document.embedJpg(slide.image);
    const scale = 960 / Math.max(image.width, image.height);
    const width = image.width * scale, height = image.height * scale;
    const page = document.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  return new Blob([await document.save()], { type: "application/pdf" });
}

export async function makeSlidePptx(slides, title) {
  const presentation = new PptxGenJS();
  presentation.layout = "LAYOUT_WIDE";
  presentation.title = title;
  const deckWidth = 13.333333, deckHeight = 7.5;
  for (const entry of slides) {
    const slide = presentation.addSlide();
    slide.background = { color: "FFFFFF" };
    const scale = Math.min(deckWidth / entry.width, deckHeight / entry.height);
    const w = entry.width * scale, h = entry.height * scale;
    slide.addImage({ data: entry.image, x: (deckWidth - w) / 2, y: (deckHeight - h) / 2, w, h, altText: entry.name });
    if (entry.notes) slide.addNotes(entry.notes);
  }
  const archive = await presentation.write({ outputType: "blob" });
  return new Blob([archive], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}
