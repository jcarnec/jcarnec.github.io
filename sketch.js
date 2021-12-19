"use strict";
const languageNames = new Intl.DisplayNames(["en"], {
  type: "language",
});
const API_KEY = "e316601ca43413563469752bc6096a5b";
// const TABLE_PATH = "/data/devMovies.csv";
const TABLE_PATH = "/data/movie_results.csv";
const MAX_POPULARITY = 150;
let barInfoBeingDisplayed = null;
let twcb;
let bc;
let legend;
let pgPos = 50;
let translated = false;
const fontSize = 10;
let genres = [
  "Adventure",
  "Drama",
  "Romance",
  "Comedy",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Western",
  "Animation",
  "Thriller",
  "Crime",
  "Action",
  "Sci",
  "Music",
  "War",
  "Doc",
  "Foreign",
  "History",
].sort();
let genreColor = undefined;
class BarChart {
  static paddingFromCanvasX = 10;
  static paddingFromCanvasY = 10;
  static xOffsetOfBar = 250;
  static spacingBetweenBars = 15;

  constructor(table, params) {
    // this.table = filterParams(table, params);
    this.params = {};
    this.table = table;
    this.localN = table.rows.length;
    this.globalN = table.rows.length;
    this.bars = this.constructBars();
    this.barsBeingShown = [];
    this.showLocalPopularity = false;
    this.actorBeingShown = undefined;
    this.directorBeingShow = undefined;
  }

  static getYearString(s) {
    return s.substring(0, 4);
  }

  constructBars() {
    function compareByDate(row1, row2) {
      if (row1.releaseDate < row2.releaseDate) {
        return -1;
      }
      if (row1.releaseDate > row2.releaseDate) {
        return 1;
      }
      return 0;
    }

    function compareByPopularity(row1, row2) {
      if (row1.obj.popularity < row2.obj.popularity) {
        return -1;
      }
      if (row1.obj.popularity > row2.obj.popularity) {
        return 1;
      }
      return 0;
    }

    this.table.rows.sort(compareByPopularity);

    let actorRegex = new RegExp(this.params.actor, "i");
    let directorRegex = new RegExp(this.params.director, "i");
    let movieRegex = new RegExp(this.params.movie, "i");
    let minYear = int(this.params.minYear);
    let maxYear = int(this.params.maxYear);
    let minRating = float(this.params.minRating);
    let maxRating = float(this.params.maxRating);
    let originalLanguage = new RegExp(this.params.originalLanguage, "i")

    const result = [];

    let j = 0;

    for (let i = 0; i < this.table.rows.length; i++) {
      if (
        this.table.rows[i].obj["vote_average"] != 0 &&
        this.table.rows[i].obj["release_date"].length > 4
      ) {
        if (this.params.actor || this.params.director || this.params.genres) {
          const row = this.table.rows[i];
          let addRow = true;

          if (this.params.actor) {
            if (!actorRegex.exec(row.obj["cast"])) {
              addRow = false;
            }
          }

          if (this.params.director) {
            if (!directorRegex.exec(row.obj["director"])) {
              addRow = false;
            }
          }

          if (this.params.movie) {
            if (
              !movieRegex.exec(
                row.obj["title"] || !movieRegex.exec(row.obj["original_title"])
              )
            ) {
              addRow = false;
            }
          }

          if (this.params.genres) {
            this.params.genres.forEach((g) => {
              if (!g.exec(row.obj["genres"])) {
                addRow = false;
              }
            });
          }

          if (this.params.minYear) {
            let yearOfRelease = int(
              BarChart.getYearString(row.obj.release_date)
            );
            if (yearOfRelease < minYear) addRow = false;
          }

          if (this.params.maxYear) {
            let yearOfRelease = int(
              BarChart.getYearString(row.obj.release_date)
            );
            if (yearOfRelease > maxYear) addRow = false;
          }


          if (this.params.minRating) {
            let rating = float(
              row.obj.vote_average
            );
            if (rating < minRating) addRow = false;
          }

          if (this.params.maxRating) {
            let rating = float(
              row.obj.vote_average
            );
            if (rating > maxRating) addRow = false;
          }

          if(this.params.originalLanguage) {
            try {
              if(!originalLanguage.exec(languageNames.of(row.obj.original_language))) {
                addRow = false
              }
            } catch {
              addRow = false
            }
          }

          if (addRow) {
            result.push(new Bar(row, j, i));
            j += 1;
          }
        } else {
          const row = this.table.rows[i];
          result.push(new Bar(row, j, i));
          j += 1;
        }
      }
    }

    this.localN = j;
    this.globalN = this.table.rows.length;

    result.forEach((b) => {
      b.setColor(this.localN, this.globalN);
    });

    result.sort(compareByDate);
    let posIndex = 0;
    result.forEach((b) => {
      b.localPosIndex = posIndex;
      posIndex += 1;
    });

    return result;
  }

  draw() {
    this.barsBeingShown = [];
    let prev = "0";

    const indexOfBarsToBeShown = Math.max(
      Math.floor((pgPos * -1) / Bar.ySpaceTakenByEachBar) - 2,
      0
    );

    for (
      let index = indexOfBarsToBeShown;
      index < indexOfBarsToBeShown + BarChartCanvas.numberOfRows + 3;
      index++
    ) {
      const bar = this.bars[index];
      if (bar != undefined) {
        if (
          barInfoBeingDisplayed != null &&
          barInfoBeingDisplayed.title === bar.title
        ) {
          barInfoBeingDisplayed.localPosIndex = bar.localPosIndex;
        }
        this.barsBeingShown.push(bar);
        bar.draw();

        // Drawing dashed line to indicate year change.

        if (bar.yearOfRelease !== prev || index == 0) {
          const aboveBar = bar.posYOfBar - BarChart.spacingBetweenBars / 2;
          strokeWeight(1);
          stroke(100);
          fill(20);
          // @ts-ignore
          drawingContext.setLineDash([5, 15]);
          line(
            BarChart.paddingFromCanvasX,
            aboveBar,
            BarChartCanvas.width - BarChart.paddingFromCanvasX,
            aboveBar
          );

          fill(0, 255);
          strokeWeight(0);
          // @ts-ignore
          drawingContext.setLineDash([]);
          const textWidth = 100;
          let yearOfRelease = str(int(bar.yearOfRelease));
          let dotString = "";
          if (index != 0)
            dotString = "•".repeat(
              min(int(bar.yearOfRelease) - (int(prev) + 1), 10)
            );

          textAlign(RIGHT);
          text(
            dotString + yearOfRelease,
            BarChartCanvas.width - BarChart.paddingFromCanvasX - textWidth,
            aboveBar - BarChartCanvas.centerTextY,
            textWidth,
            20
          );
          textAlign(CENTER);

          prev = bar.yearOfRelease;
          strokeWeight(0.5);
        }
      }
    }

    // DRAW BARCHART HEADING
  }
}

class Bar {
  static barLength = 20;
  static ySpaceTakenByEachBar = Bar.barLength + BarChart.spacingBetweenBars;
  static maximumWidth = 200;
  static minimumWidth = 5;
  static genrePadding = 5;
  static budgetPadding = 300;
  constructor(row, localIndex, globalIndex) {
    this.id = row.obj.id;
    this.localPopularity = localIndex;
    this.globalPopularity = globalIndex;
    this.localPosIndex = localIndex;
    this.title = row.obj.title;
    this.releaseDate = row.obj.release_date;
    this.yearOfRelease = BarChart.getYearString(row.obj.release_date);
    this.voteAverage = row.obj.vote_average;
    this.barWidth = map(
      this.voteAverage,
      0,
      10,
      Bar.minimumWidth,
      Bar.maximumWidth
    );
    // this.genres = eval("(" + row.obj.genres + ")").sort();
    this.genres = Function(
      '"use strict";return (' + row.obj.genres + ")"
    )().sort();
    this.posterPath = row.obj.poster_path;
    this.poster_img = null;
    this.tagline = row.obj.tagline;
    this.overview = row.obj.overview;
    let cast = row.obj.cast;
    this.cast = Function('"use strict";return (' + cast + ")")().sort();
    this.director = row.obj.director;
    let rbRatio = row.obj.revenue_divide_budget;
    if (rbRatio) {
      this.rbRatio = parseFloat(rbRatio).toFixed(2);
      this.rbRatioArea = (float(this.rbRatio) ** 0.5) * 20;
    } else this.rbRatio = "";

    let budget = row.obj.budget;
    if (budget) {
      this.budget = int(row.obj.budget);
      this.budgetArea = this.budget ** 0.5 / 100;
    } else this.budget = "";

    let result = [];
    this.genres.forEach((g, gIndex, array) => {
      let gString = g;
      if (gString == "Science Fiction") {
        gString = "Sci";
      } else if (g == "Documentary") {
        gString = "Doc";
      }
      let d = { string: gString, color: genreColor[genres.indexOf(gString)] };

      result.push(d);
    });
    this.genreString = result;

    this.runtime = int(row.obj["runtime"]);
    try {
      this.originalLanguage = languageNames.of(row.obj["original_language"]);
    } catch {
      this.originalLanguage = row.obj["original_language"];
    }
    this.originalTitle = row.obj["original_title"];
  }

  setColor(localN, globalN) {
    colorMode(RGB);
    const from = color(72, 61, 139);
    const to = color(218, 165, 32);
    this.popularityRatingGlobal = int(
      map(this.globalPopularity, 0, globalN, 0, 100)
    );
    this.normalisedPopularityGlobal = map(
      this.globalPopularity,
      0,
      globalN,
      0,
      1
    );
    this.colorGlobal = lerpColor(from, to, this.normalisedPopularityGlobal);

    this.popularityRatingLocal = int(
      map(this.localPopularity, 0, localN, 0, 100)
    );
    this.normalisedPopularityLocal = map(this.localPopularity, 0, localN, 0, 1);
    this.colorLocal = lerpColor(from, to, this.normalisedPopularityLocal);
  }

  static get posXOfBar() {
    return BarChart.paddingFromCanvasX + BarChart.xOffsetOfBar;
  }

  static get posXOfColumn() {
    return BarChart.paddingFromCanvasX;
  }

  get posYOfBar() {
    return (
      BarChart.paddingFromCanvasY +
      Bar.ySpaceTakenByEachBar * this.localPosIndex
    );
  }

  get midpointOfBar() {
    return this.posYOfBar + Bar.barLength / 2;
  }

  getPoster() {
    let urlToGetPoster =
      "https://api.themoviedb.org/3/movie/" +
      barInfoBeingDisplayed.id +
      "?api_key=" +
      API_KEY;
    let data = fetch(urlToGetPoster).then((data) => {
      data.json().then((json) => {
        fetch("https://image.tmdb.org/t/p/w500" + json.poster_path).then(
          (posterResponse) => {
            posterResponse.blob().then((blob) => {
              const imageObjectURL = URL.createObjectURL(blob);
              console.log(imageObjectURL);
              this.poster_img = loadImage(imageObjectURL);
            });
          }
        );
      });
    });
  }

  drawText() {
    strokeWeight(0);
    fill(0);
    const s = this.title;
    const x = Bar.posXOfColumn;
    const y = this.midpointOfBar + BarChartCanvas.centerTextY;
    const w = BarChart.xOffsetOfBar - Bar.posXOfColumn - 5;
    const h = Bar.barLength;
    text(s, x, y, w, h);

    // Draw rating
    fill(50);
    let k = BarChart.xOffsetOfBar - w / 2;
    strokeWeight(0.5);
    text(this.voteAverage, k, y, w, h);
  }

  draw() {
    stroke(220);
    fill(this.colorGlobal);
    rect(Bar.posXOfBar, this.posYOfBar, this.barWidth, Bar.barLength);
    fill(51);
    this.drawText();
    this.drawGenres();
    this.drawBudget();
  }
  drawBudget() {
    // textAlign(LEFT)
    let x = Bar.posXOfBar + Bar.maximumWidth + Bar.budgetPadding + 100;
    let y = this.midpointOfBar;
    stroke(0);
    fill(0, 150);
    strokeWeight(0);
    if (this.budget) text("$" + this.budget.toLocaleString("en-US"), x, y);
    strokeWeight(1);
    noFill();
    circle(x, y, this.budgetArea);
    if (float(this.rbRatio) > 1) stroke(color(0, 155, 0));
    if (float(this.rbRatio) < 1) stroke(color(155, 0, 0));
    circle(x + 100, y, this.rbRatioArea);
    strokeWeight(0);
    if (float(this.rbRatio) > 1) fill(color(0, 155, 0));
    if (float(this.rbRatio) < 1) fill(color(155, 0, 0));
    text("x" + this.rbRatio, x + 100, y);
    stroke(220);
    fill(0);
    textAlign(CENTER);
    strokeWeight(0.5);

    // Drawing relative popularity
    if (bc.showLocalPopularity) {
      textSize(Bar.barLength - 2);
      fill(this.colorLocal);
      text(
        "#" + str(bc.localN - int(this.localPopularity)),
        x + 225,
        this.midpointOfBar - BarChartCanvas.centerTextY
      );
      fill(0);
      textSize(fontSize);
    }
  }

  drawGenres() {
    let x = Bar.posXOfBar + Bar.maximumWidth + Bar.genrePadding;
    let y = this.midpointOfBar;
    strokeWeight(0);
    textSize(13);
    textAlign(LEFT);
    let charCount = 0;
    this.genreString.forEach((g, gIndex, array) => {
      try {
        fill(g.color);
      } catch {
        console.log(g);
      }
      text("  ".repeat(charCount) + g.string, x, y);
      charCount += g.string.length + 2;
    });
    strokeWeight(0.5);
    textSize(fontSize);
    textAlign(CENTER);
  }
  get selectableZone() {
    return {
      x: Bar.posXOfBar,
      y: this.posYOfBar,
      x2: Bar.posXOfBar + this.barWidth,
      y2: this.posYOfBar + Bar.barLength,
    };
  }
}

class BarChartCanvas {
  static numberOfRows = 22;
  static width = 1240;
  static height =
    BarChartCanvas.numberOfRows * Bar.ySpaceTakenByEachBar +
    BarChart.paddingFromCanvasY -
    1;

  static get centerTextY() {
    return (fontSize / 2) * -1;
  }
}

class Legend {
  static height = BarChartCanvas.height;
  static paddingX = 40;
  static paddingY = 40;
  static xOffset = 100;
  static width = 400;
  static xPos = BarChartCanvas.width + this.xOffset;
  static yPos = 0;
  static castSelectionBoxes = [];
  static directorSelectionBoxes = [];

  draw() {
    drawSelectedMovie();
    drawLegend();

    function drawLegend() {
      const x = Legend.xPos + Legend.paddingX;
      const y = Legend.yPos + Legend.paddingY;
      const w = Legend.width - Legend.paddingX * 2;
      const h = Legend.paddingY;
      const from = color(72, 61, 139);
      const to = color(218, 165, 32);
      const posOfLineY = y + h + 10;

      setGradient(x, y, w, h, from, to, "X_AXIS");

      textAlign("center");

      strokeWeight(1.5)
      text(
        "Popularity",
        x + w / 2,
        Legend.yPos + Legend.paddingY / 2 - BarChartCanvas.centerTextY
      );

      line(x, posOfLineY, x + w, posOfLineY);
      for (let i = 0; i < 3; i++) {
        let xOffset = i * (w / 2);
        line(x + xOffset, posOfLineY, x + xOffset, posOfLineY + 5);
        text((MAX_POPULARITY / 3) * i, x + xOffset, posOfLineY + 15);
      }
    }

    function drawSelectedMovie() {
      Legend.castSelectionBoxes = [];
      Legend.directorSelectionBoxes = [];

      fill(250);
      stroke(100);
      strokeWeight(1);
      let x = Legend.xPos + Legend.paddingY;
      let y = Legend.yPos + Legend.paddingY + Legend.paddingY * 2;
      let w = Legend.width - Legend.paddingX * 2;
      let h = Legend.paddingY * 10;
      rect(x, y, w, h);
      let subPadding = Legend.paddingY / 3;
      if (barInfoBeingDisplayed !== null) {
        let yEnd = barInfoBeingDisplayed.posYOfBar + pgPos;
        let xEnd = BarChartCanvas.width;
        line(x, y, xEnd, yEnd);
        line(x + w, y, xEnd, yEnd);
        line(x, y + h, xEnd, yEnd + Bar.barLength);
        line(x + w, y + h, xEnd, yEnd + Bar.barLength);
        rect(x, y, w, h);
        if (barInfoBeingDisplayed.poster_img != null) {
          image(
            barInfoBeingDisplayed.poster_img,
            x + w / 2 - 5,
            y + h / 2 - 5,
            w / 2.5,
            (w / 2.5) * 1.5
          );
        }

        fill(0);

        // Year of release
        text(
          "Year of release: " + barInfoBeingDisplayed.yearOfRelease,
          x,
          y + h / 2 + 20 * 0,
          w / 2 - 10,
          30
        );

        // Popularity
        text(
          "Popularity: " + barInfoBeingDisplayed.popularityRatingGlobal,
          x,
          y + h / 2 + 20 * 1,
          w / 2 - 10,
          30
        );

        // Rating
        text(
          "Rating: " + barInfoBeingDisplayed.voteAverage,
          x,
          y + h / 2 + 20 * 2,
          w / 2 - 10,
          30
        );

        textAlign(CENTER);
        text("Cast:", x, y + (h * 2) / 3, w / 2 - 10, 30);

        fill(0, 0, 255, 150);
        for (
          let cIndex = 0;
          cIndex < barInfoBeingDisplayed.cast.length;
          cIndex++
        ) {
          text(
            barInfoBeingDisplayed.cast[cIndex],
            x,
            y + (h * 2) / 3 + (cIndex + 1) * 20,
            w / 2 - 10,
            30
          );
          Legend.castSelectionBoxes.push({
            x1: x,
            y1: y + (h * 2) / 3 + (cIndex + 1) * 20,
            x2: x + w / 2 - 10,
            y2: y + (h * 2) / 3 + (cIndex + 1) * 20 + 10,
            content: barInfoBeingDisplayed.cast[cIndex],
          });
        }

        fill(0);
        text(
          "Director",
          x,
          y + (h * 2) / 3 + (barInfoBeingDisplayed.cast.length + 1) * 20,
          w / 2 - 10,
          30
        );

        fill(0, 0, 255, 150);
        text(
          barInfoBeingDisplayed.director,
          x,
          y + (h * 2) / 3 + (barInfoBeingDisplayed.cast.length + 2) * 20,
          w / 2 - 10,
          30
        );
        Legend.directorSelectionBoxes.push({
          x1: x,
          y1: y + (h * 2) / 3 + (barInfoBeingDisplayed.cast.length + 2) * 20,
          x2: x + w / 2 - 10,
          y2:
            y + (h * 2) / 3 + (barInfoBeingDisplayed.cast.length + 2) * 20 + 10,
          content: barInfoBeingDisplayed.director,
        });
        fill(0);
        text(barInfoBeingDisplayed.title, x, y + subPadding, w, h);
        fill(0, 100);
        let p = 0;
        if (barInfoBeingDisplayed.tagline) p = 1.5;

        textSize(11);
        strokeWeight(0);
        fill(0);
        text(barInfoBeingDisplayed.tagline, x, y + subPadding * 2, w - 4, h);

        let offset = 0;
        barInfoBeingDisplayed.genreString.forEach((g, gIndex, array) => {
          if (array.length >= 1) {
            offset = (w / (array.length + 1)) * (gIndex + 1);
          }
          try {
            fill(g.color);
            text(g.string, x + offset, y + subPadding * 5);
          } catch (error) {
            console.log(g);
          }
        });

        textSize(fontSize);
        fill(0, 255);

        // Budget

        text(
          "Runtime:  " + barInfoBeingDisplayed.runtime + " minutes.",
          x,
          y + subPadding * 7.5,
          w
        );
        text(
          "Original Language:  " + barInfoBeingDisplayed.originalLanguage,
          x,
          y + subPadding * 9.5,
          w
        );
        if (barInfoBeingDisplayed.originalLanguage !== "English") {
          text(
            "Original Title:  " + barInfoBeingDisplayed.originalTitle,
            x,
            y + subPadding * 11.5,
            w
          );
        }
        textAlign(LEFT)
        let ts = int(min(14, 7500 / barInfoBeingDisplayed.overview.length));
        textSize(ts)
        text(barInfoBeingDisplayed.overview, x + 15, y + h + subPadding * 1, w - 30, h + 240);
        textSize(fontSize)
        textAlign(CENTER)
        strokeWeight(0.5);
      } else {
        fill(0);
        text(
          "No movie selected, click on a movie bar to show more info!",
          x,
          y + h / 3,
          w,
          h
        );
      }

      if (bc.showLocalPopularity) {
        let s = "";
        if (bc.directorBeingShown) s = "director: " + bc.directorBeingShown;
        else if (bc.actorBeingShown) s = "actor: " + bc.actorBeingShown;
        textSize(20);
        strokeWeight(0);
        text("Currently showing " + s + ".", x + w / 2, y + h + 255);
      }
      textSize(fontSize);
    }
  }
}

function preload() {
  // @ts-ignore
  twcb = loadTable(TABLE_PATH, "csv", "header");
}

function setup() {
  textFont("Helvetica");
  genreColor = [
    color(230, 25, 75),
    color(60, 180, 75),
    color(255, 225, 25),
    color(0, 130, 200),
    color(245, 130, 48),
    color(145, 30, 180),
    color(70, 240, 240),
    color(240, 50, 230),
    color(210, 245, 60),
    color(250, 190, 212),
    color(0, 128, 128),
    color(220, 190, 255),
    color(170, 110, 40),
    color(128, 0, 0),
    color(150, 235, 175),
    color(128, 128, 0),
    color(0, 0, 128),
    color(128, 128, 128),
    color(0, 0, 0),
  ];
  textSize(fontSize);
  bc = new BarChart(twcb);
  legend = new Legend();
  createCanvas(
    BarChartCanvas.width + Legend.width + Legend.xOffset,
    BarChartCanvas.height
  );
}

function draw() {
  background(255);
  translateView();
  if (bc.bars != null && bc.barsBeingShown != null) {
    bc.draw();
  }
  untranslateView();

  if (bc.bars != null && bc.barsBeingShown != null) {
    legend.draw();
  }

  strokeWeight(0);
  textAlign(CENTER);
  fill(255);
  rect(0, 0, BarChartCanvas.width, 50);
  strokeWeight(0.5);
  fill(0);
  textSize(12);

  text(
    "Title",
    Bar.posXOfColumn,
    25,
    BarChart.xOffsetOfBar - Bar.posXOfColumn - 5
  );

  text("Rating", Bar.posXOfBar - 15, 25, Bar.maximumWidth);

  text(
    "Genres",
    Bar.posXOfBar + Bar.maximumWidth + Bar.genrePadding - 15,
    25,
    Bar.maximumWidth
  );

  text(
    "Budget",
    Bar.posXOfBar + Bar.maximumWidth + Bar.budgetPadding,
    25,
    Bar.maximumWidth
  );

  text(
    "Profit",
    Bar.posXOfBar + Bar.maximumWidth + Bar.budgetPadding + 100,
    25,
    Bar.maximumWidth
  );

  if (bc.showLocalPopularity) {
    text(
      "Personal Popularity Rank",
      Bar.posXOfBar + Bar.maximumWidth + Bar.budgetPadding + 225,
      25,
      Bar.maximumWidth
    );
  }

  text(
    "Year",
    BarChartCanvas.width -
      BarChart.paddingFromCanvasX -
      Bar.maximumWidth / 2 +
      10,
    25,
    Bar.maximumWidth
  );
  strokeWeight(0);
  textSize(9);
  text(
    "Year Gap",
    BarChartCanvas.width -
      BarChart.paddingFromCanvasX -
      Bar.maximumWidth / 2 -
      20,
    30,
    Bar.maximumWidth
  );

  strokeWeight(1);
  // stroke(0);
  line(0, 50, BarChartCanvas.width, 50);

  textSize(fontSize);
}

function translateView() {
  translate(0, pgPos);
  translated = true;
}

function untranslateView() {
  translate(0, -pgPos);
  translated = false;
}

function mouseWheel(event) {
  pgPos -= event.delta;
  pgPos = min(50, pgPos);
}

function setGradient(x, y, w, h, c1, c2, axis) {
  strokeWeight(1);
  noFill();
  if (axis === "Y_AXIS") {
    // Top to bottom gradient
    for (let i = y; i <= y + h; i++) {
      const inter = map(i, y, y + h, 0, 1);
      const c = lerpColor(c1, c2, inter);
      stroke(c);
      line(x, i, x + w, i);
    }
  } else if (axis === "X_AXIS") {
    // Left to right gradient
    for (let i = x; i <= x + w; i++) {
      const inter = map(i, x, x + w, 0, 1);
      const c = lerpColor(c1, c2, inter);
      stroke(c);
      line(i, y, i, y + h);
    }
  }

  stroke(220);
  fill(53);
  strokeWeight(0);
}

function loadHTMLCheckboxes() {
  let genreColorHTML = [
    "rgb(230, 25, 75)",
    "rgb(60, 180, 75)",
    "rgb(255, 225, 25)",
    "rgb(0, 130, 200)",
    "rgb(245, 130, 48)",
    "rgb(145, 30, 180)",
    "rgb(70, 240, 240)",
    "rgb(240, 50, 230)",
    "rgb(210, 245, 60)",
    "rgb(250, 190, 212)",
    "rgb(0, 128, 128)",
    "rgb(220, 190, 255)",
    "rgb(170, 110, 40)",
    "rgb(128, 0, 0)",
    "rgb(150, 235, 175)",
    "rgb(128, 128, 0)",
    "rgb(0, 0, 128)",
    "rgb(128, 128, 128)",
    "rgb(0, 0, 0)",
  ];

  genres.forEach((g, gIndex) => {
    let input = document.createElement("input");
    $(input).attr("type", "checkbox");
    $(input).attr("id", g + "-CheckBox");
    $(input).attr("value", g);
    $(input).attr("class", "CheckBox");
    let label = document.createElement("label");
    $(label).attr("for", g + "-CheckBox");
    $(label).attr("style", "color: " + genreColorHTML[gIndex]);
    $(label).text(g);

    $("#checkBoxDiv").append(input);

    $("#checkBoxDiv").append(label);
  });
}

function mouseClicked() {
  // first check if boxes are being pressed
  if (mouseY > 50) {
    bc.barsBeingShown.forEach((b) => {
      if (mouseX > b.selectableZone.x && mouseX < b.selectableZone.x2) {
        if (
          mouseY - pgPos > b.selectableZone.y &&
          mouseY - pgPos < b.selectableZone.y2
        ) {
          barInfoBeingDisplayed = b;
          b.getPoster();
        }
      }
    });

    if (barInfoBeingDisplayed !== null) {
      Legend.castSelectionBoxes.forEach((cs) => {
        if (mouseX > cs.x1 && mouseX < cs.x2) {
          if (mouseY > cs.y1 && mouseY < cs.y2) {
            formSubmitFromLinkClick(cs.content, "cast");
          }
        }
      });

      Legend.directorSelectionBoxes.forEach((ds) => {
        if (mouseX > ds.x1 && mouseX < ds.x2) {
          if (mouseY > ds.y1 && mouseY < ds.y2) {
            formSubmitFromLinkClick(ds.content, "director");
          }
        }
      });
    }
  }
}

function formSubmitFromLinkClick(content, type) {
  // genres.forEach((g) => {
  // $("#" + g + "-CheckBox").prop("checked", false);
  // });
  bc.params = {};
  bc.actorBeingShown = undefined;
  bc.directorBeingShown = undefined;

  if (type === "cast") {
    bc.params.actor = content;
    bc.actorBeingShown = content;
  } else if (type === "director") {
    bc.params.director = content;
    bc.directorBeingShown = content;
  }

  bc.bars = bc.constructBars();
  pgPos = 50;
  bc.params = {};
  bc.showLocalPopularity = true;
}

function formSubmit() {
  bc.params = {};
  barInfoBeingDisplayed = null;
  bc.params.actor = $("#actor").val();
  bc.params.director = $("#director").val();
  bc.params.movie = $("#movie").val();
  bc.params.minYear = $("#minYear").val();
  bc.params.maxYear = $("#maxYear").val();
  bc.params.minRating = $("#minRating").val();
  bc.params.maxRating = $("#maxRating").val();
  bc.params.originalLanguage = $("#originalLanguage").val();
  let genresFiltered = [];
  genres.forEach((g) => {
    let boolVal = $("#" + g + "-CheckBox").is(":checked");
    if (boolVal === true) {
      genresFiltered.push(new RegExp(g));
    }
  });

  bc.params.genres = genresFiltered;
  bc.bars = bc.constructBars();
  pgPos = 50;
  bc.showLocalPopularity = false;
  bc.actorBeingShown = undefined;
  bc.directorBeingShown = undefined;
}
