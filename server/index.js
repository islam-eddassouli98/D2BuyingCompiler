const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const XlsxPopulate = require("xlsx-populate");

const app = express();

app.use(cors());
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));

app.post("/api/process-excel", async (req, res) => {
  console.log("\n===========================");
  console.log("📥 Nuova richiesta ricevuta");

  if (!req.files || !req.files.template || !req.files.import) {
    console.error("❌ Mancano i file template o import");
    return res.status(400).send("Both template and import files are required.");
  }

  const isWoman = req.body.isWoman === "true";
  console.log("🧾 isWoman =", isWoman);

  const uploadsDir = path.join(__dirname, "uploads");
  const outputsDir = path.join(__dirname, "outputs");

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(outputsDir, { recursive: true });

  const templateFile = req.files.template;
  const importFile = req.files.import;

  const templatePath = path.join(uploadsDir, templateFile.name);
  const importPath = path.join(uploadsDir, importFile.name);
  const outputPath = path.join(outputsDir, "TEMPLATE_Hyperoom_compilato.xlsx");

  try {
    await templateFile.mv(templatePath);
    await importFile.mv(importPath);

    const templateWb = await XlsxPopulate.fromFileAsync(templatePath);
    const importWb = await XlsxPopulate.fromFileAsync(importPath);

    const templateSheet = templateWb.sheets()[0];
    const importSheet = importWb.sheets()[0];

    // Trova headers
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

      let startIndex = 0;
      if (isWoman && isNumericScale) {
        for (let i = 0; i < sizes.length; i++) {
          const header = importSheet.cell(5, sizeStart + i).value()?.toString().replace(/\s/g, "");
          if (header === "34") {
            startIndex = i;
            break;
          }
        }
      }

      const actualSizes = sizes.slice(startIndex);
      importMap.set(sku, { sizes: actualSizes, isNumericScale });
    }

    const templateStartRow = 8;
    const colModel = 3;
    const colFabric = 4;
    const colColor = 5;
    const lastTemplateRow = templateSheet.usedRange().endCell().rowNumber();

    // Colonne nel template
    const colAlphaStart = 37;       // AK
    const colNumStartMan = 27;      // AA
    const colNumStartWoman = 45;    // AS

    for (let r = templateStartRow; r <= lastTemplateRow; r++) {
      const model = templateSheet.cell(r, colModel).value();
      const fabric = templateSheet.cell(r, colFabric).value();
      const color = templateSheet.cell(r, colColor).value();
      const sku = `${model}${fabric}${color}`;

      const data = importMap.get(sku);
      if (!data) continue;

      const { sizes, isNumericScale } = data;

      let startCol;
      if (isNumericScale) {
        startCol = isWoman ? colNumStartWoman : colNumStartMan;
      } else {
        startCol = colAlphaStart;
      }

      for (let i = 0; i < sizes.length; i++) {
        const value = sizes[i];
        if (value !== undefined && value !== null && value !== "") {
          templateSheet.cell(r, startCol + i).value(value);
        }
      }
    }

    await templateWb.toFileAsync(outputPath);
    console.log("✅ File compilato con successo:", outputPath);
    res.download(outputPath);
  } catch (err) {
    console.error("❌ Errore durante il processo:", err);
    res.status(500).send("Processing failed.");
  } finally {
    // Pulizia file
    [templatePath, importPath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  }
});

app.listen(5000, () => {
  console.log("🚀 Backend pronto su http://localhost:5000");
});
