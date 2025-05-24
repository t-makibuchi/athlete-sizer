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

    groupedData.forEach(d => {
    const genders = new Set(d.persons.map(p => p.gender));
    const genres = new Set(d.persons.map(p => p.genre));
    const baseX = x(d.weight);
    const baseY = y(d.height);
    
    // ジャンルの色を設定（同じならその色、異なれば黒）
    const color = genres.size === 1 ? genreColors[d.persons[0].genre] : "black";

    if (genders.size === 2) {
        svg.append("path")
            .attr("class", "point")
            .attr("transform", `translate(${baseX},${baseY})`)
            .attr("d", d3.symbol().type(d3.symbolCircle).size(100))
            .attr("fill", color)
            .on("mouseover", event => handleMouseOver(event, d));

        svg.append("path")
            .attr("class", "point")
            .attr("transform", `translate(${baseX},${baseY})`)
            .attr("d", d3.symbol().type(d3.symbolDiamond).size(100))
            .attr("fill", color)
            .on("mouseover", event => handleMouseOver(event, d));
    } else {
        const gender = d.persons[0].gender;
        const symbolType = gender === "male" ? d3.symbolCircle : d3.symbolDiamond;

        svg.append("path")
            .attr("class", "point")
            .attr("transform", `translate(${baseX},${baseY})`)
            .attr("d", d3.symbol().type(symbolType).size(100))
            .attr("fill", color)
            .on("mouseover", event => handleMouseOver(event, d));
    }
});

    function handleMouseOver(event, d) {
        const infoText = d.persons.map(person => {
            const sizeInfo = selectedUnit === "metric"
                ? `Height: ${person.size.metric.height} cm, Weight: ${person.size.metric.weight} kg`
                : `Height: ${person.size.imperial.height_ft} ft ${person.size.imperial.height_in} in, Weight: ${person.size.imperial.weight} lbs`;

            const refInfo = person.ref ? `<br>References:<br>${person.ref.map(ref => `<a href=\"${ref.url}\" target=\"_blank\">${ref.url}</a> (as of ${ref.date})`).join('<br>')}` : "";

            return `<strong>${person.name}</strong><br>Gender: ${person.gender}, Genre: ${person.genre}, ${sizeInfo}${refInfo}`;
        }).join("<br><br>");

        d3.select("#info").html(infoText);
    }
}


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