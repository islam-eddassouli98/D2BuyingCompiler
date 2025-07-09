const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const XlsxPopulate = require("xlsx-populate");

const app = express();
app.use(cors());
app.use(fileUpload());

app.post("/api/process-excel", async (req, res) => {
  if (!req.files || !req.files.template || !req.files.import) {
    return res.status(400).send("Both template and import files are required.");
  }

  const templateFile = req.files.template;
  const importFile = req.files.import;

  const templatePath = path.join(__dirname, "uploads", templateFile.name);
  const importPath = path.join(__dirname, "uploads", importFile.name);
  const outputPath = path.join(__dirname, "outputs", "TEMPLATE_Hyperoom_compilato.xlsx");

  try {
    await templateFile.mv(templatePath);
    await importFile.mv(importPath);

    const templateWb = await XlsxPopulate.fromFileAsync(templatePath);
    const importWb = await XlsxPopulate.fromFileAsync(importPath);

    const templateSheet = templateWb.sheet("DOOR 040-IT00400007");
    const importSheet = importWb.sheet("Foglio1");

    const headers = [];
    let col = 1;
    while (true) {
      const value = importSheet.cell(5, col).value();
      if (!value) break;
      headers.push(value);
      col++;
    }

    const idxModel = headers.indexOf("Model") + 1;
    const idxFabric = headers.indexOf("Fabric") + 1;
    const idxColor = headers.indexOf("Color Code") + 1;
    const idxScale = 5;
    const sizeStart = 6;

    const lastRow = importSheet.usedRange().endCell().rowNumber();
    const lastCol = importSheet.usedRange().endCell().columnNumber();

    const importMap = new Map();

    for (let r = 6; r <= lastRow; r++) {
      const model = importSheet.cell(r, idxModel).value();
      const fabric = importSheet.cell(r, idxFabric).value();
      const color = importSheet.cell(r, idxColor).value();
      const scale = importSheet.cell(r, idxScale).value()?.toString().toLowerCase();
      const sku = `${model}${fabric}${color}`;

      if (!model || !fabric || !color || !scale) continue;
      const isNumericScale = scale === "numeri";

      const sizes = [];
      for (let c = sizeStart; c <= lastCol; c++) {
        sizes.push(importSheet.cell(r, c).value());
      }

      importMap.set(sku, { sizes, isNumericScale });
    }

    const templateStartRow = 8;
    const colModel = 3;
    const colFabric = 4;
    const colColor = 5;
    const colNumStart = 27;
    const colAlphaStart = 37;
    const lastTemplateRow = templateSheet.usedRange().endCell().rowNumber();

    for (let r = templateStartRow; r <= lastTemplateRow; r++) {
      const model = templateSheet.cell(r, colModel).value();
      const fabric = templateSheet.cell(r, colFabric).value();
      const color = templateSheet.cell(r, colColor).value();
      const sku = `${model}${fabric}${color}`;

      const data = importMap.get(sku);
      if (data) {
        const { sizes, isNumericScale } = data;
        const startCol = isNumericScale ? colNumStart : colAlphaStart;

        for (let i = 0; i < sizes.length; i++) {
          const value = sizes[i];
          if (value !== undefined && value !== null && value !== "") {
            templateSheet.cell(r, startCol + i).value(value);
          }
        }
      }
    }

    await templateWb.toFileAsync(outputPath);
    res.download(outputPath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Processing failed.");
  } finally {
    [templatePath, importPath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  }
});

app.listen(5000, () => {
  console.log("✅ Backend running at http://localhost:5000");
});
