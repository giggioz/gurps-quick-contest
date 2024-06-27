import { initConfig } from './config.js';
import { registerSettings } from './settings.js';

export const MODULE_ID = 'gurps-quick-contest';

// Modifiers dont work
// clear data is app hides

class QuickContestApp extends Application {
  constructor(options = {}) {
    super(options);
    this.actors = [null, null];
  }

  async close(options = {}) {
    this.actors = [null, null];
    return super.close(options);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'attribute-comparison-app',
      // title: 'Quick Contest',
      template: 'modules/gurps-quick-contest/templates/quick-contest-form.html',
      width: 400,
      height: 300,
      resizable: true,
      dragDrop: [{ dragSelector: '.rollable', dropSelector: '.actor-container' }],
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.handleDragDrop(html);
    html.find('#compare-button').click(this.compareAttributes.bind(this));
  }

  handleDragDrop(html) {
    const handleDrop = (event) => {
      event.preventDefault();
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      const actorId = data.actor;

      const actor = game.actors.get(actorId);
      const otf = data.otf;
      const actorIndex = event.currentTarget.id === 'actor1' ? 0 : 1;
      this.actors[actorIndex] = { actor, otf };

      // console.log('ACTOR', actor, otf)

      updateActorContainer(event.currentTarget.id, actor.name, otf, '');

      // is this using handlebars? Test it
      // this.render();
    };

    html.find('.actor-container').each((i, container) => {
      container.ondrop = handleDrop.bind(this);
      container.ondragover = (event) => event.preventDefault();
    });
  }

  // TODO
  // Data for handlebars?
  getData() {
    const data = super.getData();
    data.actors = this.actors;
    return data;
  }

  async compareAttributes() {
    if (!this.actors[0] || !this.actors[1]) {
      ui.notifications.warn('Please drop two actors to compare.');
      return;
    }

    // console.log('ACTORS', this.actors[0], this.actors[1]);

    const action0 = GURPS.parselink(this.actors[0].otf);
    await GURPS.performAction(action0.action, this.actors[0].actor);

    const res0 = GURPS.lastTargetedRolls[this.actors[0].actor.id];
    const margin0 = res0.margin;

    const action1 = GURPS.parselink(this.actors[1].otf);
    await GURPS.performAction(action1.action, this.actors[1].actor);
    const res1 = GURPS.lastTargetedRolls[this.actors[1].actor.id];
    const margin1 = res1.margin;

    let result;

    if (margin0 > margin1) {
      // result = `${this.actors[0].actor.name} wins with a higher margin of success!`;

      ChatMessage.create({
        content: `${this.actors[0].actor.name} wins with a margin of ${margin0 - margin1}.`,
        speaker: { alias: 'GURPS' },
      });
    } else if (margin1 > margin0) {
      // result = `${this.actors[1].actor.name} wins with a higher margin of success!`;
      ChatMessage.create({
        content: `${this.actors[1].actor.name} wins with a margin of ${margin1 - margin0}.`,
        speaker: { alias: 'GURPS' },
      });
    } else {
      ChatMessage.create({
        content: `it's a tie!`,
        speaker: { alias: 'GURPS' },
      });
    }

    ui.notifications.info(result);
  }
}

Hooks.on('init', () => {
  initConfig();
  registerSettings();
});

Hooks.on('ready', () => {
  game.quickContestApp = new QuickContestApp();
  // TODO remove setTimeout and use a proper Hook
  setTimeout(addToggleButton, 1000);
});

const addToggleButton = () => {
  const $toggleButton = $('<button>', {
    text: 'QC',
    css: {
      position: 'relative',
      margin: '10px',
      padding: '10px',
      width: '50px',
      height: '50px',
      backgroundColor: '#333',
      color: '#fff',
      border: 'none',
      borderRadius: '5px',
      pointerEvents: 'auto',
    },
    click: () => {
      if (game.quickContestApp.rendered) {
        game.quickContestApp.close();
      } else {
        game.quickContestApp.render(true);
      }
    },
  });

  $('#players').before($toggleButton);
};

function updateActorContainer(id, name, attrName, attrValue) {
  const actorContainer = document.getElementById(id);

  if (actorContainer) {
    const actorName = actorContainer.querySelector('.actor-name');
    const attributeName = actorContainer.querySelector('.attribute-name');
    const attributeValue = actorContainer.querySelector('.attribute-value');

    if (actorName) actorName.textContent = name;
    if (attributeName) attributeName.textContent = attrName;
    if (attributeValue) attributeValue.textContent = attrValue;
  } else {
    console.log(`Element with ID ${id} not found.`);
  }
}
