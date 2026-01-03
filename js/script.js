// script.js

// データを格納する変数
let billData = [];

// データを整形する関数
function loadData() {
    fetch('../data/gian_summary.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(rawData => {
            // JSONデータを整形
            billData = rawData.map(item => {
                // 最新の審議状況を取得（経過情報の最後の要素）
                const latestStatus = item[10] && item[10].length > 0 
                    ? item[10][item[10].length - 1][1] 
                    : item[5];
                
                // 提出会期（最初の提出会期または最新の会期）
                const sessionNumber = item[1];
                
                return {
                    "提出会期": `第${sessionNumber}回`,
                    "提出者": item[6] || "-",
                    "提出会派": item[7] || "-",
                    "審議状況": latestStatus || item[5],
                    "議院": item[0] === "衆法" ? "衆議院" : "参議院",
                    "法案名": item[3],
                    "番号": item[2]
                };
            });
            
            console.log(`${billData.length}件の法案データを読み込みました`);
        })
        .catch(error => {
            console.error('データの読み込みに失敗しました:', error);
            // エラー時はサンプルデータを使用
            billData = [
                { 提出会期: "第139回", 提出者: "熊代　昭彦君外四名", 提出会派: "自由民主党; 社会民主党・市民連合; 新党さきがけ", 審議状況: "成立", 議院: "衆議院", 法案名: "市民活動促進法案", 番号: "18" }
            ];
        });
}

// テーブル生成関数
function generateTable(rowField, colField) {
    const placeholder = document.getElementById("placeholder");
    const tableContainer = document.getElementById("table-container");
    
    if (billData.length === 0) {
        alert('データが読み込まれていません');
        return;
    }
    
    // 行と列の値を抽出（特別処理）
    let rowValues, colValues;
    
    // 提出会派の場合は分割処理
    if (rowField === "提出会派") {
        const allRowValues = new Set();
        billData.forEach(d => {
            const value = d[rowField];
            if (value && value !== "-") {
                // セミコロンで分割して個別に追加
                value.split(';').forEach(v => {
                    allRowValues.add(v.trim());
                });
            }
        });
        rowValues = [...allRowValues].sort();
    } else {
        rowValues = [...new Set(billData.map(d => d[rowField]))].sort();
    }
    
    if (colField === "提出会派") {
        const allColValues = new Set();
        billData.forEach(d => {
            const value = d[colField];
            if (value && value !== "-") {
                // セミコロンで分割して個別に追加
                value.split(';').forEach(v => {
                    allColValues.add(v.trim());
                });
            }
        });
        colValues = [...allColValues].sort();
    } else {
        colValues = [...new Set(billData.map(d => d[colField]))].sort();
    }
    
    // クロス集計（法案名のリストを保存）
    const crosstab = {};
    rowValues.forEach(row => {
        crosstab[row] = {};
        colValues.forEach(col => {
            crosstab[row][col] = [];
        });
    });
    
    billData.forEach(item => {
        const rowValue = item[rowField];
        const colValue = item[colField];
        
        // 行の値を配列に変換（提出会派の場合は分割）
        let rowValuesToCheck = [];
        if (rowField === "提出会派" && rowValue && rowValue !== "-") {
            rowValuesToCheck = rowValue.split(';').map(v => v.trim());
        } else if (rowValue) {
            rowValuesToCheck = [rowValue];
        }
        
        // 列の値を配列に変換（提出会派の場合は分割）
        let colValuesToCheck = [];
        if (colField === "提出会派" && colValue && colValue !== "-") {
            colValuesToCheck = colValue.split(';').map(v => v.trim());
        } else if (colValue) {
            colValuesToCheck = [colValue];
        }
        
        // クロス集計に追加
        rowValuesToCheck.forEach(row => {
            colValuesToCheck.forEach(col => {
                if (crosstab[row] && crosstab[row][col]) {
                    // 重複チェック（同じ法案を複数回カウントしない）
                    if (!crosstab[row][col].includes(item["法案名"])) {
                        crosstab[row][col].push(item["法案名"]);
                    }
                }
            });
        });
    });
    
    // 列幅の設定
    const firstColWidth = 150;
    const dataColWidth = 100;
    const totalColWidth = 80;
    
    // テーブルの総幅を計算
    const totalWidth = firstColWidth + (colValues.length * dataColWidth) + totalColWidth;
    
    console.log(`計算されたテーブル幅: ${totalWidth}px, 列数: ${colValues.length}`);
    
    // テーブルHTML生成
    let html = `
        <style>
            .tooltip-cell {
                position: relative;
                cursor: pointer;
            }
            .tooltip-cell:hover {
                background-color: #f1f5f9;
            }
            .tooltip-content {
                display: none;
                
                position: fixed;
                background-color: white;
                border: 2px solid #dbbb7f;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.4), 0 12px 20px -8px rgb(0 0 0 / 0.3);
                animation: tooltipFadeIn 0.2s ease-out;
                z-index: 1000;
                min-width: 300px;
                max-width: 500px;
                max-height: 400px;
                overflow-y: auto;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                line-height: 1.6;
            }
            .tooltip-cell:hover .tooltip-content {
                display: block;
            }
            .tooltip-content ul {
                margin: 0;
                padding-left: 0;
                list-style: none;
            }
            .tooltip-content li {
                margin: 4px 0;
            }

            @keyframes tooltipFadeIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -45%);  /* 少し上から */
                    box-shadow: 
                        0 10px 20px -5px rgb(0 0 0 / 0.2),  /* 影が小さい */
                        0 5px 10px -4px rgb(0 0 0 / 0.15);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);  /* 本来の位置 */
                    box-shadow: 
                        0 25px 50px -12px rgb(0 0 0 / 0.4),  /* 影が大きい */
                        0 12px 20px -8px rgb(0 0 0 / 0.3);
                }
            }

        </style>
        <div style="margin-bottom: 16px;">
            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">${rowField} × ${colField} のクロス集計</h2>
            <p style="font-size: 14px; color: #64748b;">全${billData.length}件の法案データ（${colValues.length}列、${rowValues.length}行）</p>
        </div>
        <div style="width: 100%; height: calc(100vh - 200px); overflow-x: auto; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 8px; background: white; position: relative;">
            <table style="border-collapse: collapse; font-size: 11px; width: ${totalWidth}px;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; position: sticky; left: 0; top: 0; background: #f1f5f9; z-index: 20; width: ${firstColWidth}px; font-size: 10px; line-height: 1.3;">
                            ${rowField} \\ ${colField}
                        </th>
    `;
    
    // 列ヘッダー
    colValues.forEach(col => {
        html += `
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; position: sticky; top: 0; background: #f1f5f9; z-index: 10; width: ${dataColWidth}px;">
                            ${col}
                        </th>
        `;
    });
    
    html += `
                        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; position: sticky; top: 0; background: #e2e8f0; z-index: 10; width: ${totalColWidth}px;">
                            合計
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // データ行
    rowValues.forEach(row => {
        html += `
                    <tr style="background: white;">
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 500; position: sticky; left: 0; background: white; z-index: 5; width: ${firstColWidth}px; font-size: 10px; line-height: 1.4;">
                            ${row}
                        </td>
        `;
        
        let rowTotal = 0;
        colValues.forEach(col => {
            const bills = crosstab[row][col];
            rowTotal += bills.length;
            
            const count = bills.length;
            const billsList = bills.length > 0 
                ? bills.map(name => `<li>・ ${name}</li>`).join('')
                : '';
            
            if (count > 0) {
                html += `
                        <td class="tooltip-cell" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; vertical-align: middle; width: ${dataColWidth}px;">
                            <strong>${count}</strong>
                            <div class="tooltip-content">
                                <strong style="color: #dbbb7f; margin-bottom: 8px; display: block;">${row} × ${col}</strong>
                                <ul>${billsList}</ul>
                            </div>
                        </td>
                `;
            } else {
                html += `
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #94a3b8; width: ${dataColWidth}px;">
                            -
                        </td>
                `;
            }
        });
        
        html += `
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; background: #f1f5f9; width: ${totalColWidth}px;">
                            ${rowTotal}
                        </td>
                    </tr>
        `;
    });
    
    // 合計行
    html += `
                    <tr style="background: #e2e8f0; font-weight: bold;">
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; position: sticky; left: 0; background: #e2e8f0; z-index: 5; width: ${firstColWidth}px;">
                            合計
                        </td>
    `;
    
    let grandTotal = 0;
    colValues.forEach(col => {
        let colTotal = 0;
        rowValues.forEach(row => {
            colTotal += crosstab[row][col].length;
        });
        grandTotal += colTotal;
        html += `
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: ${dataColWidth}px;">
                            ${colTotal}
                        </td>
        `;
    });
    
    html += `
                        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: ${totalColWidth}px;">
                            ${grandTotal}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // 表示切り替え
    placeholder.classList.add("hidden");
    tableContainer.classList.remove("hidden");
    tableContainer.innerHTML = html;
}

// 現在の選択を取得する関数
function getCurrentSelection() {
    const rowZone = document.querySelector(".row-zone");
    const colZone = document.querySelector(".col-zone");
    
    const rowItem = rowZone.querySelector("span:first-child");
    const colItem = colZone.querySelector("span:first-child");
    
    const rowField = rowItem ? rowItem.textContent.trim() : null;
    const colField = colItem ? colItem.textContent.trim() : null;
    
    return { rowField, colField };
}

// 表示を更新する関数
function updateDisplay() {
    const { rowField, colField } = getCurrentSelection();
    
    if (rowField && colField) {
        generateTable(rowField, colField);
    } else {
        const placeholder = document.getElementById("placeholder");
        const tableContainer = document.getElementById("table-container");
        placeholder.classList.remove("hidden");
        tableContainer.classList.add("hidden");
    }
}

// リセット関数
function resetDisplay() {
    const rowZone = document.querySelector(".row-zone");
    const colZone = document.querySelector(".col-zone");
    const placeholder = document.getElementById("placeholder");
    const tableContainer = document.getElementById("table-container");
    
    // ゾーンをリセット
    [rowZone, colZone].forEach((zone, index) => {
        const isRow = index === 0;
        zone.innerHTML = `
            <div class="flex max-w-xs flex-col items-center gap-1 text-center">
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                    ${isRow ? "行項目をドラッグ＆ドロップ" : "列項目をドラッグ＆ドロップ"}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                    利用可能な項目から項目をここにドラッグして、表の${isRow ? "行" : "列"}を定義します。
                </p>
            </div>
        `;
    });
    
    // 表示をリセット
    placeholder.classList.remove("hidden");
    tableContainer.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    // データを読み込む
    loadData();
    
    const items = document.querySelectorAll("[draggable='true']");
    const zones = document.querySelectorAll(".drop-zone");
    const updateBtn = document.getElementById("update-btn");
    const resetBtn = document.getElementById("reset-btn");

    items.forEach(item => {
        item.addEventListener("dragstart", e => {
            const label = item.dataset.label || item.querySelector(".item-label")?.textContent.trim();
            e.dataTransfer.setData("text/plain", label);
        });
    });

    zones.forEach(zone => {
        zone.addEventListener("dragover", e => {
            e.preventDefault();
        });

        zone.addEventListener("drop", e => {
            e.preventDefault();
            const text = e.dataTransfer.getData("text/plain");

            // もう片方のゾーンを取得
            const otherZone = zone.classList.contains("row-zone")
                ? document.querySelector(".col-zone")
                : document.querySelector(".row-zone");

            // 他方に同じ要素があるかチェック
            const existsInOther = Array.from(otherZone.children).some(
                child => {
                    const childText = child.textContent.trim().replace("×", "").trim();
                    return childText === text;
                }
            );

            // 現在のゾーンに同じ要素があるかチェック
            const existsInCurrent = Array.from(zone.children).some(
                child => {
                    const childText = child.textContent.trim().replace("×", "").trim();
                    return childText === text;
                }
            );

            if (existsInOther) {
                alert("この項目はすでにもう一方に設定されています。");
                return;
            }

            if (existsInCurrent) {
                alert("この項目はすでにこのゾーンに設定されています。");
                return;
            }

            // 1つだけに制限 → 既存をクリア
            zone.innerHTML = "";
            const newItem = document.createElement("div");
            newItem.className = "flex items-center justify-between p-2 rounded-md border bg-slate-100 dark:bg-slate-700";

            // ラベル部分
            const labelSpan = document.createElement("span");
            labelSpan.textContent = text;

            // ×ボタン部分
            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = "×";
            removeBtn.className = "ml-2 text-red-500 font-bold cursor-pointer";

            // 削除イベント
            removeBtn.addEventListener("click", () => {
                zone.innerHTML = `
                <div class="flex max-w-xs flex-col items-center gap-1 text-center">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                        ${zone.classList.contains("row-zone") ? "行項目をドラッグ＆ドロップ" : "列項目をドラッグ＆ドロップ"}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        利用可能な項目から項目をここにドラッグして、表を定義します。
                    </p>
                </div>
                `;
                // 削除後に表示を更新
                updateDisplay();
            });

            // 要素を組み立てて追加
            newItem.appendChild(labelSpan);
            newItem.appendChild(removeBtn);
            zone.appendChild(newItem);
            
            // ドロップ後に自動的に表示を更新
            updateDisplay();
        });
    });
    
    // 更新ボタンのイベント
    updateBtn.addEventListener("click", () => {
        updateDisplay();
    });
    
    // リセットボタンのイベント
    resetBtn.addEventListener("click", () => {
        resetDisplay();
    });
});