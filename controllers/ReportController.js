"use strict";
const { sequelize } = require('../database/db_connect');
const { QueryTypes } = sequelize;
const Sequelize = require('sequelize');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const mysql = require('mysql');
const { Pool } = require('pg');
const moment = require('moment');
const path = require("path");
const ExcelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require("jspdf");
require('jspdf-autotable');
require("../config/fonts/Arial-Unicode-normal.js");
require("../config/fonts/Arial-Unicode-Bold-normal.js");

/**
 * @name previewReport
 * @description create db connection.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.previewReport = async ({body:{ joins, connection, table, selecedCols, filters, group_by, sort_by}},res) => {
  const dbSchema = connection.connection_type == 'postgres' ? connection.default_db_schema : connection.default_db;
  const query = buildReportQuery({joins,table, selecedCols, filters, group_by, sort_by, dbSchema});
  try {
    const connConfig = {
      username: connection.host_username,
      password: connection.host_password,
      database: connection.default_db,
      host: connection.host_name,
      port: connection.host_port,
      dialect: connection.connection_type
    }
    const connSequelize = new Sequelize(connection.default_db, connection.host_username, connection.host_password, connConfig);

    

    const data = await connSequelize.query(query,{
      type: QueryTypes.SELECT
    });
      
    res.status(200).json({
      error_message: '',
      data: data,
      query,
      success: true
    });
  } catch (error) {
    // console.log(error);
    res.status(200).json({
      error_message: error.message,
      data: [],
      query,
      success: false
    });
  }
};

/**
 * @name saveReport
 * @description save report
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} message
 */
exports.saveReport = catchAsyncErrors(async ({body:{connection_id, name, description, data_query, data_model}},res) => {
  try {
    const connections = await sequelize.query(`SELECT * FROM db_connections WHERE id = :connID LIMIT 1`,{
        replacements:{
          connID: connection_id
        },
        type: QueryTypes.SELECT
    });
    if (connections.length > 0) {
      //insert report data
      await sequelize.query(`INSERT INTO report_models (connection_id, name, description, data_query, data_model) VALUES (:connection_id, :name, :description,:data_query, :data_model)`,{
        replacements:{
          connection_id: connection_id,
          name: name,
          description: description,
          data_query: data_query,
          data_model: data_model
        }
      });
      return res.status(200).json({
        success: true,
        message: 'Successfully Created Data Model!'
      });  
    } else {
      return res.status(200).json({
        success: false,
        message: 'No Connection!'
      });
    }
  } catch (error) {
    console.log(error)
  }
});

/**
 * @name reportList
 * @description get report (data models) list.
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 * @returns {array} user
 */
exports.reportList = catchAsyncErrors(async ({query: {connection_id}},res) => {
 
  const datalist =  await sequelize.query(`SELECT * FROM report_models WHERE connection_id = :connection_id`,{
    replacements:{
      connection_id: connection_id
    },
    type: QueryTypes.SELECT
  });

  res.status(200).json({
    success: true,
    data: datalist
  });
});


/**
 * @name buildReportQuery
 * @description builds query
 * @param {object} connection
 * @param {object} components
 *
 * @returns {string} query string
 */

function buildReportQuery({joins, table=[], selecedCols, filters, group_by, sort_by, dbSchema}){
  try {
    let filter_clause = '', group_by_clause = '', sort_by_clause = '';
    
    if (group_by.length) {
      group_by_clause = 'GROUP BY '
      for (const [i,el] of group_by.entries()) {
        group_by_clause+=` ${ i > 0 ? ',' : '' } ${el.column.table_name}.${el.column.column_name} `
      }
    }
    if (sort_by.length) {
      sort_by_clause = 'ORDER BY '
      for (const [i,el] of sort_by.entries()) {
        sort_by_clause+=` ${ i > 0 ? ',' : '' } ${el.column.table_name}.${el.column.column_name} ${el.order.toUpperCase()}`
      }
    }
    if (filters.length) {
      filter_clause = 'WHERE '
      for (const el of filters) {
        filter_clause+=` ${el.and_or ? el.and_or : ``} ${el.column.table_name}.${el.column.column_name} ${el.operator_type} ${ el.filter_value.one ? `'${el.filter_value.one}'` : ``  } ${el.filter_value.two ? `between '${el.filter_value.two}'` : '' } `
      }
    }
    if (table.length) {
      return `SELECT ${selecedCols.length>0 ? selecedCols.toString() : `*`} FROM ${table[0]} ${filter_clause} \n\t  ${group_by_clause} \n\t ${sort_by_clause}`;
    }
    const p_table = joins.map(e=>e.from_table);
    
    // const s_table = joins.map(e=>e.to_table); .substring(0,2) ${joins[0].to_table.substring(0,2)} ${p_table[0].substring(0,2)}
  
    let query = `SELECT ${selecedCols.length>0 ? selecedCols.toString() : `*`} FROM ${dbSchema}.${p_table[0]} ${joins[0].join_type} 
                  ${dbSchema}.${joins[0].to_table} ON 
                  ${dbSchema}.${joins[0].from_table}.${joins[0].from_column.column_name} = ${dbSchema}.${joins[0].to_table}.${joins[0].to_column.column_name}`;
    if (joins.length>1) {
      for (let i=1; i < joins.length; i++) {
        const el = joins[i];
        query+=` ${el.join_type} ${dbSchema}.${el.to_table} ON ${dbSchema}.${el.from_table}.${el.from_column.column_name} = ${dbSchema}.${el.to_table}.${el.to_column.column_name} `
      }
    } 
    console.log(`${query} ${filter_clause}`);
    return `${query} ${filter_clause} \n\t ${group_by_clause} \n\t ${sort_by_clause}`;
    
  } catch (error) {
    console.log(error);
  }
  
};

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
    doc.text(details['rep_name'], 40, 40);
    if (details['rep_desc']) {
      doc.setFontSize(10);
      doc.setFont('Arial-Unicode-normal')
      doc.text(details['rep_desc'], 40, 55);
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