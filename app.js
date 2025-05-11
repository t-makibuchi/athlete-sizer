const width = 600;
const height = 600;
const margin = {top: 20, right: 20, bottom: 30, left: 50};

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
    "judo": "green",
    "karate": "olive",
    "kickboxing/Muay Thai": "purple",
    "pro wrestling": "red",
    "rugby": "brown",
    "soccer": "lime",
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

    // 先にfilteredDataを作成
    filteredData = dataset.filter(d =>
        ((maleChecked && d.gender === "male") || (femaleChecked && d.gender === "female")) &&
        (selectedGenre === "all" || d.genre === selectedGenre)
    );

    // その後、filteredDataを使って軸の範囲を設定
    const xDomain = [
        d3.min(filteredData, d => d.size[selectedUnit].weight) - 5, 
        d3.max(filteredData, d => d.size[selectedUnit].weight) + 5
    ];

    const yDomain = selectedUnit === "metric" ? [
        d3.min(filteredData, d => d.size.metric.height) - 5, 
        d3.max(filteredData, d => d.size.metric.height) + 5
    ] : [
        d3.min(filteredData, d => d.size.imperial.height_ft + d.size.imperial.height_in / 12) - 0.2,
        d3.max(filteredData, d => d.size.imperial.height_ft + d.size.imperial.height_in / 12) + 0.2
    ];

    const x = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

    svg.selectAll("g.axis").remove();

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + (selectedUnit === "metric" ? "kg" : "lbs")));

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
            d3.axisLeft(y).ticks(10)
            .tickFormat(d => {
                if (selectedUnit === "metric") {
                    return d + "cm";
                } else {
                    const ft = Math.floor(d);
                    const inches = Math.round((d - ft) * 12);
                    return `${ft}ft ${inches}in`;
                }
            })
        );

    svg.selectAll(".point").remove();

    svg.selectAll(".point")
	    .data(filteredData)
	    .enter()
	    .append("path")
	    .attr("class", "point")
	    .attr("transform", d => `translate(${x(d.size[selectedUnit].weight)},${y(selectedUnit === "metric" ? d.size.metric.height : (d.size.imperial.height_ft + d.size.imperial.height_in / 12))})`)
	    .attr("d", d3.symbol().type(d => d.gender === "male" ? d3.symbolCircle : d3.symbolTriangle).size(100))
	    .attr("fill", d => genreColors[d.genre])
		.on("mouseover", function(event, d) {
		    svg.selectAll(".point")
		        .attr("d", d3.symbol().type(d => d.gender === "male" ? d3.symbolCircle : d3.symbolTriangle).size(100));

		    d3.select(this)
		        .attr("d", d3.symbol().type(d.gender === "male" ? d3.symbolCircle : d3.symbolTriangle).size(200));

		    const selectedUnit = document.querySelector('input[name="unit"]:checked').value;
    
		    const sizeInfo = selectedUnit === "metric"
		        ? `Height: ${d.size.metric.height} cm, Weight: ${d.size.metric.weight} kg`
		        : `Height: ${d.size.imperial.height_ft} ft ${d.size.imperial.height_in} in, Weight: ${d.size.imperial.weight} lbs`;

		    const refInfo = d.ref ? `<br>References:<br>${d.ref.map(ref => `<a href="${ref.url}" target="_blank">${ref.url}</a> (as of ${ref.date})`).join('<br>')}` : "";

		    const infoText = `<strong>${d.name}</strong><br>Gender: ${d.gender}, Genre: ${d.genre}, ${sizeInfo}${refInfo}`;

		    d3.select("#info").html(infoText);
});

    
    // const を削除して再代入にする
	filteredData = dataset.filter(d =>
    	((maleChecked && d.gender === "male") || (femaleChecked && d.gender === "female")) &&
    	(selectedGenre === "all" || d.genre === selectedGenre)
	);
}

// 検索ボタン処理
document.getElementById("search-btn").addEventListener("click", () => {
    const searchText = document.getElementById("search-box").value.toLowerCase();

    if (!searchText) return;

    const selectedUnit = document.querySelector('input[name="unit"]:checked').value;

    const matchedData = filteredData.filter(d => d.name.toLowerCase().includes(searchText));

    if (matchedData.length === 0) return;

    const infoText = matchedData.map(d => {
        const sizeInfo = selectedUnit === "metric"
            ? `Height: ${d.size.metric.height} cm, Weight: ${d.size.metric.weight} kg`
            : `Height: ${d.size.imperial.height_ft} ft ${d.size.imperial.height_in} in, Weight: ${d.size.imperial.weight} lbs`;

        const refInfo = d.ref 
            ? `<br>References:<br>${d.ref.map(ref => `<a href="${ref.url}" target="_blank">${ref.url}</a> (as of ${ref.date})`).join('<br>')}` : "";

        return `<strong>${d.name}</strong><br>Gender: ${d.gender}, Genre: ${d.genre}, ${sizeInfo}${refInfo}`;
    }).join("<br><br>");

    d3.select("#info").html(infoText);

    svg.selectAll(".point")
        .attr("d", d3.symbol().type(d => d.gender === "male" ? d3.symbolCircle : d3.symbolTriangle).size(100));

    svg.selectAll(".point")
        .filter(d => matchedData.includes(d))
        .attr("d", d3.symbol().type(d => d.gender === "male" ? d3.symbolCircle : d3.symbolTriangle).size(200));
});

// テキストボックスでEnterを押した時にも検索を実行
document.getElementById("search-box").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        document.getElementById("search-btn").click();
    }
});

d3.json("data.json").then(data => {
    dataset = data;
    updateChart();
});

document.getElementById('male').addEventListener('change', updateChart);
document.getElementById('female').addEventListener('change', updateChart);
genreSelect.on('change', updateChart);
unitRadios.on('change', updateChart);