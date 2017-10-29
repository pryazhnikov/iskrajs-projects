const REACTION_TIME_MS = 250;
const STATUS_SHOW_PERIOD_MS = 1000;

console.log("Scenario run start");

// Кнопка для глобального включения / выключения
var button = require('@amperka/button')
  .connect(P7);

var isSchemeEnabled = true;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button triggers new schema status: ", isSchemeEnabled);
  if (!isSchemeEnabled) {
    resetSchemeState();
  } else {
    resetStatusLight();
  }
}
button.on('release', toggleSchemaStatus);

// Показ глобального статуса аналогичного ТВ:
// Лампочка моргает когда система выключена
// Лампочка выключена, когда система включена и работает
var statusValue = false;
function toggleStatusLight(forcedValue) {
  let newStatusValue;
  if (typeof forcedValue != 'undefined') {
    newStatusValue = !!forcedValue;
  } else if (isSchemeEnabled) {
    newStatusValue = false;
  } else {
    newStatusValue = !statusValue;
  }

  if (newStatusValue != statusValue) {
    statusValue = newStatusValue;
    let intValue = statusValue ? 1 : 0;
    LED1.write(intValue);
  }
}
setInterval(toggleStatusLight, STATUS_SHOW_PERIOD_MS);

// Сброс лампочки (для включения системы)
function resetStatusLight() {
  console.log("Status light reset to default state");
  toggleStatusLight(false);
}

var pot = require('@amperka/pot')
  .connect(A5);
var sensor = require('@amperka/light-sensor')
  .connect(A0);
var light = require('@amperka/led')
  .connect(P0);

function resetSchemeState() {
  console.log("Schema reset to default state");
  light.turnOff();
}

setInterval(
  function () {
    if (!isSchemeEnabled) return;

    var potValue = pot.read();
    var sensorLux = sensor.read('lx');
    var potValueFixed = potValue * 100;
    var shouldBeEnabled = (sensorLux <= potValueFixed);

    console.log(
      "Pot:", potValue.toFixed(3),
      "light_sensor:", sensorLux.toFixed(3),
      "pot_fixed:", potValueFixed.toFixed(3),
      "enable:", shouldBeEnabled
    );

    if (shouldBeEnabled) {
      light.blink(1, 0.5);
    } else {
      light.turnOff();
    }
  },
  REACTION_TIME_MS
);
