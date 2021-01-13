var app = angular.module("app", ["ngRoute"]).config(function ($routeProvider) {
  $routeProvider
    .when("/main", {
      templateUrl: "js/main.html",
      controller: "MainController",
    })
    .otherwise({ redirectTo: "/main" });
});

app.service("MapService", function () {
  this.convertDate = (dateConvert) => {
    let fecha = new Date(Number(dateConvert));
    let day = fecha.getDate();
    let month = fecha.getMonth() + 1;
    let year = fecha.getFullYear();
    let hour = fecha.getHours();
    let minutes = fecha.getMinutes();
    let seconds = fecha.getSeconds();
    return (
      day +
      "/" +
      month +
      "/" +
      year +
      " " +
      hour +
      ":" +
      minutes +
      ":" +
      seconds
    );
  };

  this.convertDateURL = (dateConvert) => {
    let fecha = new Date();
    let fechaLast = new Date() - new Date(dateConvert);
    let fechaUTC = fecha.getUTCDate();
    let hour = new Date(fechaLast).getUTCHours();
    let minutes = new Date(fechaLast).getUTCMinutes();
    let seconds = new Date(fechaLast).getUTCSeconds();
    return "PT" + hour + "H" + minutes + "M" + seconds + "S/PRESENT";
  };
});

app.controller("MainController", [
  "$scope",
  "MapService",
  function ($scope, mapService) {
    $scope.transparenLayer = true;
    $scope.visibleLayers = 0;
    $scope.visibleInfo = [];
    $scope.visibleInfo[0] = 0;
    $scope.visibleInfo[1] = 0;
    $scope.zoomIn = 1;
    $scope.time = Date.now();
    $scope.timeIn = Date.now();
    $scope.timePast = Date.now() - 1000 * 60 * 60 * 24;

    let lon = -0;
    let lat = 0;
    let mapas = null;

    $scope.present = mapService.convertDate(new Date());
    $scope.timeString = mapService.convertDate($scope.time);

    $scope.changeTime = () => {
      if ($scope.visibleInfo) {
        let fecha = new Date(Number($scope.time));
        $scope.timeString = mapService.convertDate(fecha);
        infos.forEach((layer, i) => {
          mapas.removeLayer(layer);
        });
        infos = [];
        infos.push(layerPosition(mapService.convertDateURL(fecha)));
        mapas.getLayers().push(infos[0]);
      }
    };

    const layerAux = (trans, time) => {
      return new ol.layer.Tile({
        visible: true,
        source: new ol.source.TileWMS({
          key: "YWRtaW46RVQ3SlNENlU=",
          projections: ["EPSG:4326"],
          url:
            "http://rtmps-stg-geoserver-1.emsa.geo-solutions.it/geoserver/FRONTEX-CACHE/wms",
          params: {
            LAYERS: "FRONTEX-CACHE:LAND",
            VERSION: "1.3.0",
            TRANSPARENT: trans,
            BGCOLOR: "#0089f5",
            TIME: time,
          },
        }),
      });
    };

    const layerTracks = () => {
      return new ol.layer.Vector({
        visible: true,
        source: new ol.source.Vector({
          format: new ol.format.GeoJSON(),
          url: "/mocks/countries.json",
        }),
      });
    };

    const layerPosition = (time) =>
      new ol.layer.Tile({
        visible: true,
        selectable: "html",
        source: new ol.source.TileWMS({
          key: "YWRtaW46RVQ3SlNENlU=",
          visible: true,
          projections: ["EPSG:4326"],
          url:
            "http://rtmps-stg-geoserver-1.emsa.geo-solutions.it/geoserver/SEG/wms",
          params: {
            LAYERS: "SEG:SEG_ALL",
            VERSION: "1.3.0",
            TIME: time,
          },
        }),
      });

    var layers = [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
      new ol.layer.Tile({
        source: new ol.source.BingMaps({
          imagerySet: ["Aerial"],
          key:
            "AjYFgPajAtr1ZYaNsAQagj0mKBatMmzZRUIE5HnnAZ9sTL34e19O-8aJiSjNEWjL",
          projections: ["EPSG:3395"],
        }),
      }),
      layerAux(false),
    ];

    const maps = (lon, lat) =>
      new ol.Map({
        target: "map",
        layers: [layers[$scope.visibleLayers]],
        view: new ol.View({
          center: ol.proj.fromLonLat([lon, lat]),
          zoom: $scope.zoomIn,
        }),
      });

    const navCoor = () => {
      return (
        navigator.geolocation &&
        navigator.geolocation.getCurrentPosition(
          function (objPosition) {
            lon = objPosition.coords.longitude;
            lat = objPosition.coords.latitude;
            mapas = maps(lon, lat);
          },
          function (objPositionError) {
            lon = 0.0;
            lat = 0.0;
            mapas = maps(lon, lat);
          },
          {
            maximumAge: 75000,
            timeout: 15000,
          }
        )
      );
    };
    navCoor();

    $scope.changeZoom = () => {
      mapas.getView().setZoom($scope.zoomIn);
    };

    $scope.pulsar = () => {
      // layers[2].sourceChangeKey_.target.params_ &&
      // layers[2].sourceChangeKey_.target.params_.TRANSPARENT ?
      // layers[2].sourceChangeKey_.target.params_.TRANSPARENT=false :
      // layers[2].sourceChangeKey_.target.params_.TRANSPARENT=true;
      //console.log(mapas.getLayers().array_[0].sourceChangeKey_.target.params_.TRANSPARENT);
      $scope.transparenLayer = !$scope.transparenLayer;
      layers.push(layerAux($scope.transparenLayer, "PT6H20M12S/PRESENT"));
      layers.forEach((layer, i) => {
        mapas.removeLayer(layer);
      });
      mapas.getLayers().push(layers[layers.length - 1]);
    };

    // $scope.pulsar = (id) => {
    //   if ($scope.transparenLayer) {
    //     $scope.addLayer(3);
    //   } else {
    //     $scope.addLayer(2);
    //   }
    //   $scope.transparenLayer = !$scope.transparenLayer;
    // };

    layers.forEach((layer, i) => {
      $scope.visibleLayers[i] = true;
    });

    var style = new ol.style.Style({
      fill: new ol.style.Fill({
        color: "rgba(255, 255, 255, 0.6)",
      }),
      stroke: new ol.style.Stroke({
        color: "#319FD3",
        width: 1,
      }),
      text: new ol.style.Text({
        font: "12px Calibri,sans-serif",
        fill: new ol.style.Fill({
          color: "#000",
        }),
        stroke: new ol.style.Stroke({
          color: "#fff",
          width: 3,
        }),
      }),
    });

    function tileUrlFunction(tileCoord) {
      return ("positions.json?" + "{z}/{x}/{y}.vector.pbf")
        .replace("{z}", String(tileCoord[0] * 2 - 1))
        .replace("{x}", String(tileCoord[1]))
        .replace("{y}", String(tileCoord[2]))
        .replace(
          "{a-d}",
          "abcd".substr(((tileCoord[1] << tileCoord[0]) + tileCoord[2]) % 4, 1)
        );
    }

    var infos = [layerPosition(), layerTracks()];

    infos.forEach((layer, i) => {
      $scope.visibleInfo[i] = false;
    });

    $scope.addLayer = (id) => {
      $scope.visibleLayers = id;
      delete mapas;
      layers.forEach((layer, i) => {
        mapas.removeLayer(layer);
        if (id === i) {
          mapas.getLayers().push(layer);
        }
      });
      infos.forEach((layer, i) => {
        mapas.removeLayer(layer);
        if ($scope.visibleInfo[i]) mapas.getLayers().push(layer);
      });
    };

    $scope.addInfo = (id) => {
      delete mapas;
      if ($scope.visibleInfo[id]) {
        $scope.visibleInfo[id] = false;
        mapas.removeLayer(infos[id]);
      } else {
        $scope.visibleInfo[id] = true;
        layers.forEach((layer, i) => {
          mapas.removeLayer(layer);
          if ($scope.visibleLayers === i) mapas.getLayers().push(layer);
        });
        infos.forEach((layer, i) => {
          mapas.removeLayer(layer);
          if ($scope.visibleInfo[i]) mapas.getLayers().push(layer);
        });
      }
    };
  },
]);
