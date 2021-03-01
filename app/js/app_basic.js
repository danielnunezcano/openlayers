var app = angular.module("app", ["ngRoute"]).config(function ($routeProvider) {
  $routeProvider
    .when("/main", {
      templateUrl: "js/main.html",
      controller: "MainController",
    })
    .otherwise({ redirectTo: "/main" });
});

app.controller("MainController", [
  function () {
    const map = new ol.Map({
      target: "map",
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM(),
        }),
        new ol.layer.Tile({
          id: "positions",
          visible: true,
          source: new ol.source.TileWMS({
            refresh: {
              force: true,
            },
            visible: true,
            projections: ["EPSG:4326"],
            url: "http://localhost:9000/getMap",
          }),
        }),
      ],
      view: new ol.View({
        center: [0, 0],
        zoom: 0,
      }),
    });
  },
]);
