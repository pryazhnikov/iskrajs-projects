console.log('Hello world!');
const LED_TICK_PERIOD = 1000;

var button = require('@amperka/button')
  .connect(A0);

function tickLed(count) {
  console.log(getTime(), 'LED1 enable, remaining iterations: ', count);
  LED1.write(true);
  setTimeout(
    function () {
      console.log(getTime(), 'LED1 disable');
      LED1.write(false);
      if (count > 1) {
        setTimeout(
          function () {
            tickLed(count - 1);
          },

          LED_TICK_PERIOD
        );
      }
    },

    LED_TICK_PERIOD
  );
}

button.on(
  'press',
  function () {
    tickLed(3);
  }
);
