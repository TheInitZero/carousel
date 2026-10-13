import * as XSTATE from "https://cdn.jsdelivr.net/npm/xstate@5.32.6/+esm";

const TOTAL_SLIDES = 4;

/** @type {HTMLDivElement} */
let $carousel = $("#carousel");

/** @type {HTMLButtonElement} */
let $stopButton = $("#stop-button");

/** @type {HTMLDivElement} */
let $tablist = $("#tablist");

/** @type {HTMLButtonElement} */
let $tab1 = $("#tab-1");

/** @type {HTMLButtonElement} */
let $tab2 = $("#tab-2");

/** @type {HTMLButtonElement} */
let $tab3 = $("#tab-3");

/** @type {HTMLButtonElement} */
let $tab4 = $("#tab-4");

let $tabs = [$tab1, $tab2, $tab3, $tab4];

/** @type {HTMLDivElement} */
let $slides = $("#slides");

/** @type {HTMLDivElement} */
let $tabpanel1 = $("#tabpanel-1");

/** @type {HTMLDivElement} */
let $tabpanel2 = $("#tabpanel-2");

/** @type {HTMLDivElement} */
let $tabpanel3 = $("#tabpanel-3");

/** @type {HTMLDivElement} */
let $tabpanel4 = $("#tabpanel-4");

let $tabpanels = [$tabpanel1, $tabpanel2, $tabpanel3, $tabpanel4];

const intervalActor = XSTATE.fromCallback(function ({ sendBack, input }) {
  function onInterval() {
    sendBack({ type: "NEXT" });
  }

  let id = setInterval(onInterval, input.duration);

  return function () {
    clearInterval(id);
  };
});

const machine = XSTATE.setup({
  actors: {
    intervalActor,
  },
  actions: {
    showSlide: XSTATE.assign({
      currentSlideNumber({ context, event }) {
        let { slideNumber } = event;
        let outOfRange = slideNumber > context.totalSlides || slideNumber <= 0;
        if (outOfRange) return;
        return slideNumber;
      },
    }),
    showNextSlide: XSTATE.assign({
      currentSlideNumber({ context }) {
        let { currentSlideNumber } = context;
        let nextSlideNumber = currentSlideNumber + 1;
        let outOfRange = nextSlideNumber > context.totalSlides;
        if (outOfRange) nextSlideNumber = 1;
        return nextSlideNumber;
      },
    }),
    showPrevSlide: XSTATE.assign({
      currentSlideNumber({ context }) {
        let { currentSlideNumber, totalSlides } = context;
        let nextSlideNumber = currentSlideNumber - 1;
        let outOfRange = nextSlideNumber <= 0;
        if (outOfRange) nextSlideNumber = totalSlides;
        return nextSlideNumber;
      },
    }),
  },
}).createMachine({
  id: "carousel-machine",
  context({ input }) {
    return { currentSlideNumber: 1, totalSlides: input.totalSlides };
  },
  initial: "Paused",
  states: {
    Paused: {
      on: {
        TOGGLE: {
          target: "Playing",
        },
      },
    },
    Playing: {
      invoke: {
        id: "interval-actor",
        src: "intervalActor",
        input: { duration: 2_500 },
      },
      on: {
        TOGGLE: {
          target: "Paused",
        },
      },
    },
  },
  on: {
    SHOW: {
      actions: "showSlide",
    },
    NEXT: {
      actions: "showNextSlide",
    },
    PREV: {
      actions: "showPrevSlide",
    },
  },
});

const actor = XSTATE.createActor(machine, {
  input: {
    totalSlides: TOTAL_SLIDES,
  },
});

actor.subscribe(function (snapshot) {
  console.log(snapshot);
  $carousel.dataset.stopped = snapshot.value === "Paused";
  $carousel.dataset.current = snapshot.context.currentSlideNumber;

  $stopButton.ariaLabel =
    snapshot.value === "Paused"
      ? "Start automatic slide show"
      : "Stop automatic slide show";

  $slides.ariaLive = snapshot.value === "Paused" ? "polite" : "off";

  for (
    let tabNumber = 1;
    tabNumber <= snapshot.context.totalSlides;
    tabNumber += 1
  ) {
    let index = tabNumber - 1;
    let $tab = $tabs[index];
    let $tabpanel = $tabpanels[index];
    let isActive = tabNumber === snapshot.context.currentSlideNumber;

    if (isActive) {
      $tab.removeAttribute("tabindex");
    } else {
      $tab.setAttribute("tabindex", "-1");
    }

    $tabpanel.ariaHidden = isActive ? "false" : "true";
  }
});

actor.start();
window.ACTOR = actor;

$stopButton.addEventListener("click", function () {
  actor.send({ type: "TOGGLE" });
});

$tab1.addEventListener("click", function () {
  actor.send({ type: "SHOW", slideNumber: 1 });
});

$tab2.addEventListener("click", function () {
  actor.send({ type: "SHOW", slideNumber: 2 });
});

$tab3.addEventListener("click", function () {
  actor.send({ type: "SHOW", slideNumber: 3 });
});

$tab4.addEventListener("click", function () {
  actor.send({ type: "SHOW", slideNumber: 4 });
});

$tablist.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "ArrowRight": {
      return actor.send({ type: "NEXT" });
    }
    case "ArrowLeft": {
      return actor.send({ type: "PREV" });
    }
    case "Home": {
      return actor.send({ type: "SHOW", slideNumber: 1 });
    }
    case "End": {
      return actor.send({ type: "SHOW", slideNumber: 4 });
    }
  }
});

// ---- ---- ---- ----

function $(selector) {
  return document.querySelector(selector);
}
