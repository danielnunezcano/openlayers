var app = angular.module("app", ["ngRoute"]).config(function ($routeProvider) {
  $routeProvider
    .when("/main", {
      templateUrl: "js/main.html",
      controller: "MainController",
    })
    .otherwise({ redirectTo: "/main" });
});

app.factory("MapLayers", function () {
  this.style = (feature) => [
    new ol.style.Style({
      text: new ol.style.Text({
        text: featureproperties.POS_ID,
        font: "12px Calibri,sans-serif",
        textAlign: "left",
        offsetY: -15,
      }),
      image: new ol.style.RegularShape({
        fill: new ol.style.Fill({
          color:
            feature.values_.ORIGINATOR_ORG == "ES"
              ? [251, 255, 0, 1]
              : [200, 200, 200, 1],
        }),
        stroke: new ol.style.Stroke({
          color:
            feature.values_.ORIGINATOR_ORG == "ES"
              ? [255, 0, 0, 1]
              : [100, 100, 100, 1],
          width: 3,
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
      url:
        "http://debian:8001/SEGServer/v1/wfs/SEGPositionsWfs?service=WFS&version=1.0.0&request=GetFeature&typeName=SEG:SEG_ALL&maxFeatures=50&outputFormat=application/json",
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
    id: "positions",
    visible: true,
    selectable: "html",
    source: new ol.source.TileWMS({
      refresh: {
        force: true,
      },
      visible: true,
      projections: ["EPSG:4326"],
      url: "http://debian:8001/SEGServer/v1/wms/SEGPositions",
      params: {
        LAYERS: "SEG:SEG_ALL",
        VERSION: "1.3.0",
      },
    }),
  });
  this.layerPositionInfo = new ol.layer.Tile({
    visible: true,
    selectable: "html",
    source: new ol.source.TileWMS({
      visible: true,
      projections: ["EPSG:4326"],
      url: "http://debian:8001/SEGServer/v1/wms/SEGPositions",
      params: {
        LAYERS: "SEG:SEG_ALL",
        VERSION: "1.3.0",
        RENDERLABEL:
          "SEG:SEG_ALL;EMSA_ID IN (129747);FLAG_STATE,SHIP_NAME,IMO,MMSI,IR,CALL_SIGN,EXTERNAL_MARKING",
        EXCEPTIONS: "application/vnd.ogc.se_inimage",
      },
    }),
  });
  return {
    infos: [
      this.layerPosition,
      this.layerTracks,
      this.layerVector,
      this.layerPositionInfo,
    ],
  };
});

app.factory("MapFactory", function () {
  return {
    lon: 38.3346994376,
    lat: -0.4796058945,
    mapas: null,
  };
});

app.service("MapService", function () {
  this.distanciaCoord = (point1, point2) => {
    //double radioTierra = 3958.75;//en millas
    const radioTierra = 6371; //en kilómetros
    const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
    const dLng = (point2.lng - point1.lng) * (Math.PI / 180);
    const sindLat = Math.sin(dLat / 2);
    const sindLng = Math.sin(dLng / 2);
    const va1 =
      Math.pow(sindLat, 2) +
      Math.pow(sindLng, 2) *
        Math.cos(point1.lat * (Math.PI / 180)) *
        Math.cos(point2.lat * (Math.PI / 180));
    const va2 = 2 * Math.atan2(Math.sqrt(va1), Math.sqrt(1 - va1));
    const distancia = radioTierra * va2;

    return distancia;
  };

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
  "$timeout",
  "$scope",
  "MapService",
  "MapFactory",
  "MapLayers",
  function ($timeout, $scope, mapService, mapFactory, mapLayers) {
    const servicioWFS =
      "http://debian:8001/SEGServer/v1/wfs/SEGPositionsWfs?service=WFS&version=1.0.0&request=GetFeature&typeName=SEG:SEG_ALL&maxFeatures=50&outputFormat=application/json";
    $scope.transparenLayer = true;
    $scope.visibleLayers = 0;
    $scope.visibleInfo = [];
    $scope.visibleInfo[0] = 0;
    $scope.visibleInfo[1] = 0;
    $scope.visibleInfo[2] = 0;
    $scope.zoomIn = 15;
    $scope.time = Date.now();
    $scope.timeIn = Date.now();
    $scope.timePast = Date.now() - 1000 * 60 * 60 * 24;

    let lon = -0.4796058945;
    let lat = 38.3346994376;
    let mapas = null;

    var tiempo = "PT0H/PRESENT";

    $scope.present = mapService.convertDate(new Date());
    $scope.timeString = mapService.convertDate($scope.time);

    $scope.changeTime = () => {
      mapas.getLayers().forEach((layer) => {
        let fecha = new Date(Number($scope.time));
        $scope.timeString = mapService.convertDate(fecha);
        var url =
          layer.getProperties() &&
          layer.getProperties().id &&
          layer.getSource().getUrls();
        if (layer.getProperties() && layer.getProperties().id) {
          layer
            .getSource()
            .updateParams({ TIME: mapService.convertDateURL(fecha) });
        }
      });
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
            TIME: tiempo,
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
          projections: ["EPSG:4326"],
        }),
      }),
      new ol.layer.Tile({
        source: new ol.source.TileWMS({
          key: "YWRtaW46RVQ3SlNENlU=",
          projections: ["EPSG:4326"],
          url:
            "http://rtmps-stg-geoserver-1.emsa.geo-solutions.it/geoserver/FRONTEX-CACHE/wms",
          params: {
            LAYERS: "FRONTEX-CACHE:LAND",
            VERSION: "1.3.0",
            BGCOLOR: "#0089f5",
            TIME: tiempo,
          },
        }),
      }),
    ];

    var valores = { lat: 0 };

    var maps = (lon, lat) =>
      new ol.Map({
        target: "map",
        layers: [layers[$scope.visibleLayers]],
        view: new ol.View({
          projection: "EPSG:4326",
          center: ol.proj.fromLonLat([lat, lon], "EPSG:4326"),
          zoom: $scope.zoomIn,
        }),
      });

    const mostrarResultado = {
      type: "FeatureCollection",
      features: [],
      crs: {
        type: "name",
        properties: {
          name: "urn:ogc:def:crs:EPSG::4326",
        },
      },
    };

    const layerResultado = new ol.layer.Vector({
      id: "resultVessel",
      source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
      }),
      style: this.style,
    });

    const navCoor = () => {
      return (
        navigator.geolocation &&
        navigator.geolocation.getCurrentPosition(
          function (objPosition) {
            mapFactory.lon = objPosition.coords.longitude;
            mapFactory.lat = objPosition.coords.latitude;
            mapas = maps(mapFactory.lat, mapFactory.lon);
            mapas.on("click", function (evt) {
              var clickPositionArray = ol.coordinate
                .createStringXY(10)(evt.coordinate)
                .split(",");
              const clickPosition = {
                lat: clickPositionArray[0],
                lng: clickPositionArray[1],
              };
              console.log(clickPosition);
              console.log("mapas.zoom: " + mapas.getView().getZoom());
              fetchRTMPS(servicioWFS, clickPosition);
            });
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
      $scope.transparenLayer = !$scope.transparenLayer;
      layers.push(layerAux($scope.transparenLayer, "PT6H20M12S/PRESENT"));
      layers.forEach((layer, i) => {
        mapas.removeLayer(layer);
      });
      mapas.getLayers().push(layers[layers.length - 1]);
    };

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
      $timeout();
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
            $timeout(actualizacion, 1000);
        });
      }
    };

    const styleInfo = (feature) => {
      const height = 22 - displacementY;
      return [
        new ol.style.Style({
          text: new ol.style.Text({
            text: feature.properties.SHIP_NAME || "",
            font: "bold 12px Calibri,sans-serif",
            fill: new ol.style.Fill({
              color: "white",
            }),
            textAlign: "left",
            offsetY: height - 146,
            offsetX: 15,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: feature.properties.PSC_TYPE || "",
            font: "bold 12px Calibri,sans-serif",
            fill: new ol.style.Fill({
              color: "white",
            }),
            textAlign: "left",
            offsetY: height - 132,
            offsetX: 15,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "MMSI: " + (feature.properties.MMSI || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 90,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "Name: " + (feature.properties.SHIP_NAME || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 75,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text:
              "Speed: " +
              (feature.properties.SPEED_OVER_GROUND + "knots" || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 60,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "Latitude: " + (feature.geometry.coordinates[0] || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 45,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "Longitude: " + (feature.geometry.coordinates[1] || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 30,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "Source: " + (feature.properties.SOURCE || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height - 15,
          }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            text: "Heading: " + (feature.properties.HEADING || ""),
            font: "12px Calibri,sans-serif",
            textAlign: "left",
            offsetY: height,
          }),
        }),
        ...dibujo,
      ];
    };

    const radius = 80;
    displacementY = 70;

    const dibujo = [
      new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: "yellow",
          }),
          radius: 10,
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "blue",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [95, displacementY + 80],
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "blue",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [35, displacementY + 80],
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "white",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [95, displacementY + 40],
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "white",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [35, displacementY + 40],
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "white",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [95, displacementY],
        }),
      }),
      new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color: "white",
          }),
          points: 4,
          radius: radius,
          angle: 0.785398,
          displacement: [35, displacementY],
        }),
      }),
    ];

    const fetchRTMPS = (service, clickPosition) => {
      let minDistance = null;
      let resultFeature = null;
      const numDis = 1;
      const lat1 = parseFloat(clickPosition.lat) - numDis;
      const lng1 = parseFloat(clickPosition.lng) - numDis;
      const lat2 = parseFloat(clickPosition.lat) + numDis;
      const lng2 = parseFloat(clickPosition.lng) + numDis;
      const bbox = lat1 + "," + lng1 + "," + lat2 + "," + lng2;
      return fetch(service + "&BBOX=" + bbox)
        .then((response) => response.json())
        .then(
          (data) =>
            data &&
            data.features &&
            data.features.forEach((feature) => {
              const featurePoint = {
                lat: feature.geometry.coordinates[0],
                lng: feature.geometry.coordinates[1],
              };
              const distance = mapService.distanciaCoord(
                clickPosition,
                featurePoint
              );
              if (minDistance == null || minDistance > distance) {
                resultFeature = feature;
                minDistance = distance;
              }
            })
        )
        .then(() => {
          var iconFeature = new ol.Feature(
            resultFeature &&
              resultFeature.geometry &&
              new ol.geom.Point([
                resultFeature.geometry.coordinates[0],
                resultFeature.geometry.coordinates[1],
              ])
          );
          //console.log(iconFeature);
          mapas.removeLayer(layerResultado);
          layerResultado
            .getSource()
            .getFeatures()
            .forEach((feature) =>
              layerResultado.getSource().removeFeature(feature)
            );
          layerResultado.getSource().addFeature(iconFeature);
          layerResultado.setStyle(styleInfo(resultFeature));
          mapas.getLayers().push(layerResultado);
          //console.log(layerResultado);
        });
    };

    const actualizacion = () => {
      let activo = false;
      mapas.getLayers().forEach((layer) => {
        if (layer.getProperties() && layer.getProperties().id) {
          layer.getSource().refresh();
          activo = true;
        }
      });
      activo && $timeout(actualizacion, 20000); 
    }
  },
]);
