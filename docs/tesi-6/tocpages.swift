// Pages on which each chapter and appendix opens, read back from the PDF (macOS PDFKit).
// swift tocpages.swift <pdf>  → JSON {"chapters":[…], "appendices":[…]}
import PDFKit
let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
var ch: [Int] = [], app: [Int] = []
for i in 0..<d.pageCount {
  guard let s = d.page(at: i)?.string else { continue }
  if s.contains("AUSCMARKCH") { ch.append(i + 1) }
  if s.contains("AUSCMARKAPP") { app.append(i + 1) }
}
print("{\"chapters\": \(ch), \"appendices\": \(app)}")
