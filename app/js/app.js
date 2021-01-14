var app = angular.module("app", ["ngRoute"]).config(function ($routeProvider) {
  $routeProvider
    .when("/main", {
      templateUrl: "js/main.html",
      controller: "MainController",
    })
    .otherwise({ redirectTo: "/main" });
});

app.factory("MapLayers", function () {
  this.styleFunction = (feature, resolution) => {
    var style;
    var geom = feature.getGeometry();
    if (geom.getType() == "Point") {
      var text = feature.get("text");
      baseTextStyle.text = text;
      // this is inefficient as it could create new style objects for the
      // same text.
      // A good exercise to see if you understand would be to add caching
      // of this text style
      var isoCode = feature.get("isoCode").toLowerCase();
      style = new ol.style.Style({
        text: new ol.style.Text(baseTextStyle),
        image: new ol.style.Icon({
          src: "../assets/img/flags/" + isoCode + ".png",
        }),
        zIndex: 2,
      });
    } else {
      style = highlightStyle;
    }

    return [style];
  };
  this.style = (feature) => [
    new ol.style.Style({
      text: new ol.style.Text({
        text: feature.values_.ORIGINATOR_ORG == "ES" && feature.values_.ORIGINATOR_ORG,
        font: "12px Calibri,sans-serif",
        textAlign: "center",
        offsetY: -15,
      }),
      image: new ol.style.RegularShape({
        fill: new ol.style.Fill({
          color: feature.values_.ORIGINATOR_ORG == "ES" ? [251, 255, 0, 1] : [200, 200, 200, 1],
        }),
        stroke: new ol.style.Stroke({
          color: feature.values_.ORIGINATOR_ORG == "ES" ? [255, 0, 0, 1] : [100, 100, 100, 1],
          width: 3
        }),
        points: 3,
        radius: 10,
        rotation: Math.PI / 4,
        angle: 0,
      }),
    }),
  ];
  this.layerVector = new ol.layer.Vector({
    source: new ol.source.Vector({
      format: new ol.format.GeoJSON(),
      url: "/mocks/features.json",
      //url: "http://a10p044:8001/SEGServer/v1/wfs/SEGPositionsWfs/{x}"
    }),
    style: this.style,
  });
  this.layerTracks = new ol.layer.Vector({
    visible: true,
    source: new ol.source.VectorTile({
      format: new ol.format.GeoJSON(),
      url: "/mocks/countries.json",
    }),
  });
  this.layerPosition = new ol.layer.Tile({
    visible: true,
    selectable: "html",
    source: new ol.source.TileWMS({
      visible: true,
      projections: ["EPSG:4326"],
      url: "http://a10p044:8001/SEGServer/v1/wms/SEGPositions",
      params: {
        LAYERS: "SEG:SEG_ALL",
        VERSION: "1.3.0",
        MAX_FEATURES: "50",
      },
    }),
  });
  return {
    infos: [this.layerPosition, this.layerTracks, this.layerVector],
  };
});

app.factory("MapFactory", function () {
  return {
    lon: -0,
    lat: 0,
    mapas: null,
  };
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
  "MapFactory",
  "MapLayers",
  function ($scope, mapService, mapFactory, mapLayers) {
    $scope.transparenLayer = true;
    $scope.visibleLayers = 0;
    $scope.visibleInfo = [];
    $scope.visibleInfo[0] = 0;
    $scope.visibleInfo[1] = 0;
    $scope.visibleInfo[2] = 0;
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

    var maps = (lon, lat) =>
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
            mapFactory.lon = objPosition.coords.longitude;
            mapFactory.lat = objPosition.coords.latitude;
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

    //var infos = [mapLayers.layerPosition, mapLayers.layerTracks, mapLayers.layerVector];

    mapLayers.infos.forEach((layer, i) => {
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
      mapLayers.infos.forEach((layer, i) => {
        mapas.removeLayer(layer);
        if ($scope.visibleInfo[i]) mapas.getLayers().push(layer);
      });
    };

    $scope.addInfo = (id) => {
      delete mapas;
      if ($scope.visibleInfo[id]) {
        $scope.visibleInfo[id] = false;
        mapas.removeLayer(mapLayers.infos[id]);
      } else {
        $scope.visibleInfo[id] = true;
        layers.forEach((layer, i) => {
          mapas.removeLayer(layer);
          if ($scope.visibleLayers === i) mapas.getLayers().push(layer);
        });
        mapLayers.infos.forEach((layer, i) => {
          mapas.removeLayer(layer);
          if ($scope.visibleInfo[i]) mapas.getLayers().push(layer);
        });
      }
    };
  },
]);
