const width = 600;
const height = 600;
const margin = {top: 20, right: 20, bottom: 20, left: 50};

// 点のサイズ設定（通常時と選択時）
const POINT_SIZE_NORMAL = 50;
const POINT_SIZE_SELECTED = 200;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let dataset = [];
let filteredData = [];

const genreColors = {
    "American football": "teal",
    "athletics": "magenta",
    "baseball": "aqua",
    "basketball": "coral",
    "boxing": "yellow",
    "Brazilian jiu-jitsu/grappling": "cyan",
    "judo": "green",
    "karate": "olive",
    "kickboxing/Muay Thai": "purple",
    "mma": "pink",
    "pro wrestling": "red",
    "rugby": "brown",
    "soccer": "lime",
    "sumo": "gold",
    "tennis": "orange",
    "wrestling": "blue"
};

const genres = Object.keys(genreColors);

const genreSelect = d3.select("#genre-select");
genres.forEach(genre => {
    genreSelect.append("option").attr("value", genre).text(genre);
});

const unitRadios = d3.selectAll("input[name='unit']");

function updateChart() {
    const maleChecked = document.getElementById('male').checked;
    const femaleChecked = document.getElementById('female').checked;
    const selectedGenre = genreSelect.node().value;
    const selectedUnit = document.querySelector('input[name="unit"]:checked').value;

    let highlightedPoint = null; // 現在強調表示されているポイントを保持する

    filteredData = dataset.filter(d =>
        ((maleChecked && d.gender === "male") || (femaleChecked && d.gender === "female")) &&
        (selectedGenre === "all" || d.genre === selectedGenre)
    );

    const groupedDataMap = new Map();
    filteredData.forEach(d => {
        const height = selectedUnit === "metric" ? d.size.metric.height : (d.size.imperial.height_ft + d.size.imperial.height_in / 12);
        const weight = d.size[selectedUnit].weight;
        const key = `${height}-${weight}`;

        if (!groupedDataMap.has(key)) {
            groupedDataMap.set(key, []);
        }
        groupedDataMap.get(key).push(d);
    });

    const groupedData = Array.from(groupedDataMap.entries()).map(([key, persons]) => {
        const [height, weight] = key.split("-").map(Number);
        return {height, weight, persons};
    });

    const xDomain = [
        d3.min(groupedData, d => d.weight) - 5,
        d3.max(groupedData, d => d.weight) + 5
    ];

    const yDomain = [
        d3.min(groupedData, d => d.height) - (selectedUnit === "metric" ? 5 : 0.2),
        d3.max(groupedData, d => d.height) + (selectedUnit === "metric" ? 5 : 0.2)
    ];

    const x = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

	// X軸のスケールと軸描画後にグリッド線を追加
	const xAxis = d3.axisBottom(x)
	    .ticks(10)
	    .tickFormat(d => d + (selectedUnit === "metric" ? "kg" : "lbs"))
	    .tickSize(-height + margin.top + margin.bottom);  // グリッド線用の負のtickSize

	// Y軸のスケールと軸描画後にグリッド線を追加
	const yAxis = d3.axisLeft(y)
	    .ticks(10)
	    .tickFormat(d => {
	        if (selectedUnit === "metric") {
	            return d + "cm";
	        } else {
	            const ft = Math.floor(d);
	            const inches = Math.round((d - ft) * 12);
	            return `${ft}ft ${inches}in`;
	        }
	    })
	    .tickSize(-width + margin.left + margin.right);  // グリッド線用の負のtickSize

	// 既存の軸を削除
	svg.selectAll("g.axis").remove();

	// X軸追加（グリッド線付き）
	svg.append("g")
	    .attr("class", "axis x-axis")
	    .attr("transform", `translate(0,${height - margin.bottom})`)
	    .call(xAxis);

	// Y軸追加（グリッド線付き）
	svg.append("g")
	    .attr("class", "axis y-axis")
	    .attr("transform", `translate(${margin.left},0)`)
	    .call(yAxis);

	// グリッド線のスタイル設定 (CSSをJavaScript内で設定)
	svg.selectAll(".axis line")
	    .attr("stroke", "#ccc")   // グリッド線の色（薄いグレー）
	    .attr("stroke-dasharray", "2,2");  // 点線にする場合（実線の場合は削除）

	svg.selectAll(".axis path")
	    .attr("stroke", "#000");  // 軸線は黒

    svg.selectAll(".point").remove();

    groupedData.forEach(d => {
        const genders = new Set(d.persons.map(p => p.gender));
        const genres = new Set(d.persons.map(p => p.genre));
        const baseX = x(d.weight);
        const baseY = y(d.height);
        
        const color = genres.size === 1 ? genreColors[d.persons[0].genre] : "black";

        if (genders.size === 2) {
            svg.append("path")
                .datum(d)
                .attr("class", "point")
                .attr("transform", `translate(${baseX},${baseY})`)
                .attr("d", d3.symbol().type(d3.symbolCircle).size(POINT_SIZE_NORMAL))
                .attr("fill", color)
                .on("mouseover", event => handleMouseOver(event, d));

            svg.append("path")
                .datum(d)
                .attr("class", "point")
                .attr("transform", `translate(${baseX},${baseY})`)
                .attr("d", d3.symbol().type(d3.symbolDiamond).size(POINT_SIZE_NORMAL))
                .attr("fill", color)
                .on("mouseover", event => handleMouseOver(event, d));
        } else {
            const gender = d.persons[0].gender;
            const symbolType = gender === "male" ? d3.symbolCircle : d3.symbolDiamond;

            svg.append("path")
                .datum(d) 
                .attr("class", "point")
                .attr("transform", `translate(${baseX},${baseY})`)
                .attr("d", d3.symbol().type(symbolType).size(POINT_SIZE_NORMAL))
                .attr("fill", color)
                .on("mouseover", event => handleMouseOver(event, d));
                // ↑ mouseoutは削除する（マウスを離しても大きさを戻さないため）
        }
    });


    function handleMouseOver(event, d) {
        const selectedUnit = document.querySelector('input[name="unit"]:checked').value;
    
        const infoText = d.persons.map(person => {
            const sizeInfo = selectedUnit === "metric"
                ? `Height: ${person.size.metric.height} cm, Weight: ${person.size.metric.weight} kg`
                : `Height: ${person.size.imperial.height_ft} ft ${person.size.imperial.height_in} in, Weight: ${person.size.imperial.weight} lbs`;
    
            const refInfo = person.ref ? `<br>References:<br>${person.ref.map(ref => `<a href="${ref.url}" target="_blank">${ref.url}</a> (as of ${ref.date})`).join('<br>')}` : "";
    
            return `<strong>${person.name}</strong><br>Gender: ${person.gender}, Genre: ${person.genre}, ${sizeInfo}${refInfo}`;
        }).join("<br><br>");
    
        d3.select("#info").html(infoText);
    
        // 前回強調表示された点を元に戻す
        if (highlightedPoint) {
            highlightedPoint.attr("d", p => {
                const genders = new Set(p.persons.map(x => x.gender));
                const symbolType = (genders.size === 2 || p.persons[0].gender === "male")
                    ? d3.symbolCircle
                    : d3.symbolDiamond;
                return d3.symbol().type(symbolType).size(POINT_SIZE_NORMAL)();
            });
        }
    
        // 検索で大きくなった点も含め、全ての点を通常サイズに戻す
        svg.selectAll(".point")
            .attr("d", p => {
                const genders = new Set(p.persons.map(x => x.gender));
                const symbolType = (genders.size === 2 || p.persons[0].gender === "male")
                    ? d3.symbolCircle
                    : d3.symbolDiamond;
                return d3.symbol().type(symbolType).size(POINT_SIZE_NORMAL)();
            });
    
        // 現在の点を大きく表示しhighlightedPointに保存
        highlightedPoint = d3.select(event.currentTarget);
        highlightedPoint.attr("d", p => {
            const genders = new Set(p.persons.map(x => x.gender));
            const symbolType = (genders.size === 2 || p.persons[0].gender === "male")
                ? d3.symbolCircle
                : d3.symbolDiamond;
            return d3.symbol().type(symbolType).size(POINT_SIZE_SELECTED)();
        });
    }
}

// テキストボックスでEnterを押した時にも検索を実行
document.getElementById("search-box").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        document.getElementById("search-btn").click();
    }
});

document.getElementById("search-btn").addEventListener("click", () => {
    const searchText = document.getElementById("search-box").value.toLowerCase();

    if (!searchText) return;

    const matchedData = filteredData.filter(d =>
        d.name.toLowerCase().includes(searchText)
    );

    if (matchedData.length === 0) return;

    const selectedUnit = document.querySelector('input[name="unit"]:checked').value;

    const infoText = matchedData.map(d => {
        const sizeInfo = selectedUnit === "metric"
            ? `Height: ${d.size.metric.height} cm, Weight: ${d.size.metric.weight} kg`
            : `Height: ${d.size.imperial.height_ft} ft ${d.size.imperial.height_in} in, Weight: ${d.size.imperial.weight} lbs`;

        const refInfo = d.ref
            ? `<br>References:<br>${d.ref.map(ref => `<a href="${ref.url}" target="_blank">${ref.url}</a> (as of ${ref.date})`).join('<br>')}`
            : "";

        return `<strong>${d.name}</strong><br>Gender: ${d.gender}, Genre: ${d.genre}, ${sizeInfo}${refInfo}`;
    }).join("<br><br>");

    d3.select("#info").html(infoText);

    // 全ての点を元のサイズと形に戻す
    svg.selectAll(".point")
    .attr("d", d => {
        const genders = new Set(d.persons.map(x => x.gender));
        const symbolType = (genders.size === 2 || d.persons[0].gender === "male") 
                            ? d3.symbolCircle 
                            : d3.symbolDiamond;
        return d3.symbol().type(symbolType).size(POINT_SIZE_NORMAL)();
    });

    // 検索結果と一致する点だけ大きくする（形も考慮）
    svg.selectAll(".point")
        .filter(d => matchedData.some(md => d.persons.some(p => p.name === md.name)))
        .attr("d", d => {
            const genders = new Set(d.persons.map(x => x.gender));
            const symbolType = (genders.size === 2 || d.persons[0].gender === "male")
                                ? d3.symbolCircle
                                : d3.symbolDiamond;
            return d3.symbol().type(symbolType).size(POINT_SIZE_SELECTED)();
        });
});

d3.json("data.json").then(data => {
    dataset = data;
    updateChart();
});

document.getElementById('male').addEventListener('change', updateChart);
document.getElementById('female').addEventListener('change', updateChart);
genreSelect.on('change', updateChart);
unitRadios.on('change', updateChart);