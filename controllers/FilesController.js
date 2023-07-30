"use strict";
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const moment = require('moment');
const path = require("path");
const ExcelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require("jspdf");
require('jspdf-autotable');
require("../config/fonts/Arial-Unicode-normal.js");
require("../config/fonts/Arial-Unicode-Bold-normal.js");

/**
 * @name generateExcel
 * @description Generate excel file and buffer
 * @param {array} datalist
 * @param {array} columns
 * @param {object} body
 * @param {object} res
 *
 * @returns {array} path
 */
exports.generateExcel = catchAsyncErrors(async ({ body },res) => {
  const { datalist, columns, details } = body;
  let fileName = '';
  try {
    let re_name = details['rep_name']
    let re_desc = details['rep_desc']
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("WorkSheet", {
      properties: { 
        wrapText: true
      },
    });
    worksheet.getRow(1).height = 40;
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 25;

    const cell = generateCells(columns.length);
    
    for (const cl of cell) {
      worksheet.getColumn(cl).width = 30;
      worksheet.getColumn(cl).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
    worksheet.getCell("A1").value = re_name;
    worksheet.getCell("A1").font = { size: 16, bold: false };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.mergeCells(`A1:${cell[columns.length-1]}1`);
    worksheet.getCell("A2").value = re_desc;
    worksheet.getCell("A2").font = { size: 11, bold: false };
    worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.mergeCells(`A2:${cell[columns.length-1]}2`);
    const thinBlackBorder = { style: "thin", color: { argb: "FF000000" } };
    let rowNum = 4;

    columns.forEach((el, index) => {
      worksheet.getCell(cell[index] + "3").value = el;
      worksheet.getCell(cell[index] + "3").font = { size: 11, bold: false };
      worksheet.getCell(cell[index] + "3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEEEEE" },
      };
      worksheet.getCell(cell[index] + "3").border = {
        top: thinBlackBorder,
        right: thinBlackBorder,
        bottom: thinBlackBorder,
        left: thinBlackBorder,
      };
      worksheet.getCell(cell[index] + "3").alignment = {
        vertical: "middle",
        horizontal: "left",
      };
    });

    if (datalist.length>0) {
      for (const row of datalist) {
        for (const [index, column] of columns.entries()) {
          worksheet.getCell(cell[index] + rowNum).value =  row[column]
          worksheet.getCell(cell[index] + rowNum).font = { size: 11, bold: false };
          worksheet.getCell(cell[index] + rowNum).alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true
          };
          worksheet.getCell(cell[index] + rowNum).border = {
            top: thinBlackBorder,
            right: thinBlackBorder,
            bottom: thinBlackBorder,
            left: thinBlackBorder,
          };
          
        }
        rowNum++;
      }
    } else {
      worksheet.mergeCells(`A${rowNum}:${cell[columns.length-1]}${rowNum}`);
      worksheet.getCell(`A${rowNum}`).value ='No Data Found';
      worksheet.getRow(rowNum).height = 25;
      worksheet.getCell(`A${rowNum}`).alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
      };
    }

    fileName = `/excels/report_${re_name}_${moment().format("MMDDYYYY_hhmmssa")}.xlsx`; // path for file
    const filePath = path.join(global.rootPath, `/public${fileName}`);
    await workbook.xlsx.writeFile(filePath);

  } catch (error) {
    console.log(error);
  }

  res.status(200).json({
    success: true,
    data: fileName
  });
});

/**
 * @name generateCsv
 * @description Generate csv file and buffer
 * @param {array} datalist
 * @param {array} columns
 * @param {object} body
 * @param {object} res
 *
 * @returns {array} path
 */
exports.generateCsv = catchAsyncErrors(async ({ body },res) => {
  const { datalist, columns, details } = body;
  let fileName = '';
  try {
    let rep_name = convertToSlug(details['rep_name']);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("WorkSheet", {
      properties: { defaultRowHeight: 20 },
    });
    worksheet.insertRow(1, columns);
    datalist.forEach((row, index) => {
      let values = [];
      columns.forEach((tableColumn) => {
        values.push(row[tableColumn]);
      });
      worksheet.insertRow(index + 2, values);
    });
    const data = await workbook.csv.writeBuffer();
    var universalBOM = "\uFEFF";
    fileName = `/csv/report_${rep_name}_${moment().format("MMDDYYYY_hhmmssa")}.csv`; // path for file
    const filePath = path.join(global.rootPath, `/public${fileName}`);
    fs.createWriteStream(filePath).write(universalBOM+data);

  } catch (error) {
    console.log(error)
  }
  res.status(200).json({
    success: true,
    data: fileName
  });
})

/**
 * @name generatePdf
 * @description Generate pdf file and buffer
 * @param {array} datalist
 * @param {array} columns
 * @param {object} body
 * @param {object} res
 *
 * @returns {array} path
 */
exports.generatePdf = catchAsyncErrors(async ({ body },res) => {
  const { datalist, columns, details } = body;
  let fileName = '';
  try {
    let orientation = details['orientation'] === "landscape" ? "l" : "p";
    let rep_name = convertToSlug(details['rep_name']);
    const doc = new jsPDF({
      orientation: orientation, //set orientation
      unit: "pt", //set unit for document
      format: "letter" //set document standard
    });
    doc.setFont('Arial-Unicode-normal');
    doc.setFontSize(13);
    doc.setFont('Arial-Unicode-Bold');
    doc.text(`Report Name: ${details['rep_name']}`, 40, 40);
    if (details['rep_desc']) {
      doc.setFontSize(10);
      doc.setFont('Arial-Unicode-normal')
      doc.text(`Report Description: ${details['rep_desc']}`, 40, 55);
    }
    let height = 60;
    
    const rows = getRows(datalist, columns);
    
    doc.autoTable(columns, rows, {
      tableWidth: details[orientation] === "landscape" ? '1150' : '700',
      theme: 'plain',
      startY: height ?  height + 10 : null,
      styles: {
        lineColor: 240,
        lineWidth: 1,
        valign: 'middle',
        overflow: 'linebreak',
        cellPadding : {top: 3, right: 4, bottom: 2, left: 1.5},
        fontSize: 8,
        font: 'Arial-Unicode-normal'
      },
      headStyles: {
        textColor:[255, 255, 255], 
        cellPadding : {top: 4, right: 2, bottom: 3, left: 2},
        fillColor: [104, 104, 104],
        lineColor: 240,
        font: 'Arial-Unicode-Bold',
        fontSize: 8.5 
      },
      bodyStyles:{
        minCellWidth: 30,
      },
      margin: {top: 40}
    });
    const pages = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    for (let j = 1; j < pages + 1 ; j++) {
      doc.setFont('Arial-Unicode-normal')
      doc.setDrawColor(0, 0, 0);
      doc.line(20, pageHeight - 30, pageWidth-20, pageHeight - 30);
      doc.setPage(j);
      var str = "Page " + j;
      str = str + " of " + pages;
      doc.text(str,pageWidth/2, pageHeight - 15, 'center');
    }
    
    fileName = `/pdf/report_${rep_name}_${moment().format("MMDDYYYY_hhmmssa")}.pdf`; // path for file
    const filePath = path.join(global.rootPath, `/public${fileName}`); // append with root
    await doc.save(filePath);
    
  } catch (error) {
    console.log(error);
  }
  res.status(200).json({
    success: true,
    data: fileName
  });
})

/**
 * @name generateCells
 * @description generate excel cell
 * @param {string} count
 *
 */
function generateCells(count) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const array = [];

  for (let i = 0; i < count; i++) {
    const index1 = Math.floor(i / 26);
    const index2 = i % 26;

    const element = index1 > 0 ? alphabet[index1 - 1] + alphabet[index2] : alphabet[index2];
    array.push(element);
  }

  return array;
}

/**
 * @name getRows
 * @description get table body rows from data list
 * @param {array} datalist
 * @param {array} columns
 *
 */
function getRows(datalist, columns){
  const rows = [];
  if (datalist.length>0) {
    for (const data of datalist) {
      let temp = [], text = '';
      for (const col of columns) {
        text = { content: data[col] ? data[col] : ''}
        temp.push(text);
      }
      rows.push(temp);
    }
  } else {
    rows.push([{content: 'No Data Found', colSpan: columns.length, styles: { halign: 'center' }}])
  }
  return rows;
}

/**
 * @name convertToSlug
 * @description get in slug 
 * @param {string} Text
 *
 */
function convertToSlug(Text) {
  return Text.toLowerCase()
      .replace(/ /g, "_")
      .replace(/[^\w-]+/g, "");
}

/**
 * @name removeFile
 * @description delete file
 * @param {string} file_path
 *
 */
exports.removeFile = catchAsyncErrors(async ({body},res) =>{
  const { file_path } = body;
  setTimeout(() => {
    const filePath = path.join(global.rootPath, `/public${file_path}`);
    fs.unlink(filePath, (err) => {
      if (err)  console.log(err);
    });
  }, 30000);
  res.status(200).json({
    success: true,
    massage: 'file deleted'
  });
})