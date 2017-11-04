/**
 * Проект: ночник
 *
 * Суть:
 * Лампа загорается, когда показания с датчика освещенности станут ниже
 * предела, задаваемого с помощью потенциометра. Если освещенность
 * придёт в норму, то лампа погаснет.
 */

// Настройки подключения датчиков

/** Пин, на который подключена кнопка включения/выключения */
const PIN_STATUS_BUTTON = P0;
/** Пин, на который подключена лампочка */
const PIN_LIGHT = A0;
/** Пин, на который подключен датчик освещённости */
const PIN_LIGHT_SENSOR = A2;
/** Пин, на который подключен потенциометер */
const PIN_POTENTIOMETER = A5;

// Остальные настройки
const REACTION_TIME_MS = 250;
const STATUS_SHOW_PERIOD_MS = 1000;

console.log("Scenario run start");

// Кнопка для глобального включения / выключения
const $button = require('@amperka/button')
  .connect(PIN_STATUS_BUTTON);

let isSchemeEnabled = true;
function toggleSchemaStatus() {
  isSchemeEnabled = !isSchemeEnabled;
  console.log("Button triggers new schema status: ", isSchemeEnabled);
  if (!isSchemeEnabled) {
    resetSchemeState();
  } else {
    resetStatusLight();
  }
}
$button.on('release', toggleSchemaStatus);

// Индикатор работоспособности схемы. Работает аналогично ТВ:
// Лампочка моргает, когда система выключена
// Лампочка выключена, когда система включена и работает
let statusValue = false;
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

const $pot = require('@amperka/pot')
  .connect(PIN_POTENTIOMETER);
const $sensor = require('@amperka/light-sensor')
  .connect(PIN_LIGHT_SENSOR);
const $light = require('@amperka/led')
  .connect(PIN_LIGHT);

function resetSchemeState() {
  console.log("Schema reset to default state");
  $light.turnOff();
}

setInterval(
  function () {
    if (!isSchemeEnabled) return;

    var potValue = $pot.read();
    var sensorLux = $sensor.read('lx');
    var potValueFixed = potValue * 100;
    var shouldBeEnabled = (sensorLux <= potValueFixed);

    $light.toggle(shouldBeEnabled);

    console.log(
      "Pot:", potValue.toFixed(3),
      "light_sensor:", sensorLux.toFixed(3),
      "pot_fixed:", potValueFixed.toFixed(3),
      "enable:", shouldBeEnabled
    );
  },
  REACTION_TIME_MS
);
