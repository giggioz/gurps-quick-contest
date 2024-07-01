import { initConfig } from './config.js';
import { registerSettings } from './settings.js';

export const MODULE_ID = 'gurps-quick-contest';

class QuickContestApp extends Application {
  constructor(options = {}) {
    super(options);
    this.actors = [null, null];
    this.modifiers = [null, null];
  }

  async close(options = {}) {
    this.actors = [null, null];
    this.modifiers = [null, null];
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

  // Returns GURPS types (modifier, attack, skill-spell)
  getAction(otf) {
    const parsed = GURPS.parselink(otf);
    const action = parsed.action;
    return action;
  }

  handleDragDrop(html) {
    const handleDrop = (event) => {
      event.preventDefault();
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));

      const slotIndex = event.currentTarget.id === 'actor1' ? 0 : 1;

      const action = this.getAction(data.otf);
      let VALUE;

      // console.log('action', action)
      if (action.type === 'modifier') {
        this.modifiers[slotIndex] = action.mod;
        updateModifierContainer(event.currentTarget.id, action.orig);
        return;
      }
      const actorId = data.actor;
      const actor = game.actors.get(actorId);
      const otf = data.otf;
      this.actors[slotIndex] = { actor, otf };

      console.log(action);
      // console.log('ACTOR', actor, otf)
      if (action.type === 'skill-spell') {
        let skill = GURPS.findSkillSpell(actor, action.name);
        VALUE = skill.level;
      }

      if (action.type === 'attack') {
        let attack = GURPS.findAttack(actor, action.name, action.isMelee, action.isRanged);
        VALUE = attack.level;
      }

      if (action.type === 'attribute') {
        const path = action.path;
        // console.log('path', path);
        // const path = 'c.d';
        const keys = path.split('.'); // Split the path into an array of keys

        VALUE = actor.system;
        for (const key of keys) {
          // console.log('key', key);
          VALUE = VALUE[key]; // Access each key in the path
          // console.log('VALUE after', VALUE);
        }

        // VALUE = actor.system.attributes[action.name].value;
      }
      // console.log('VALUEEEE', VALUE);
      updateActorContainer(event.currentTarget.id, actor.name, otf, VALUE, actor.img);

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

    // Reset Bucket Modifier
    GURPS.ModifierBucket.clear(true)

    console.log(this.modifiers);

    const action0 = GURPS.parselink(this.actors[0].otf);
    await GURPS.performAction(action0.action, this.actors[0].actor);
    const res0 = GURPS.lastTargetedRolls[this.actors[0].actor.id];
    const margin0 = res0.margin;
    const modifier0 = this.modifiers[0] || 0;
    const tot0 = margin0 + parseInt(modifier0);

    const action1 = GURPS.parselink(this.actors[1].otf);
    await GURPS.performAction(action1.action, this.actors[1].actor);
    const res1 = GURPS.lastTargetedRolls[this.actors[1].actor.id];
    const margin1 = res1.margin;
    const modifier1 = this.modifiers[1] || 0;
    const tot1 = margin1 + parseInt(modifier1);

    // console.log(tot0, tot1);
    let result;

    if (tot0 > tot1) {
      result = `${this.actors[0].actor.name} wins with a margin of ${tot0 - tot1}.`;

      ChatMessage.create({
        content: result,
        speaker: { alias: 'GURPS' },
      });
    } else if (tot1 > tot0) {
      result = `${this.actors[1].actor.name} wins with a margin of ${tot1 - tot0}.`;
      ChatMessage.create({
        content: result,
        speaker: { alias: 'GURPS' },
      });
    } else {
      result = `it's a tie!`;
      ChatMessage.create({
        content: result,
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

function updateModifierContainer(id, mod) {
  const actorContainer = document.getElementById(id);

  if (actorContainer) {
    const modifier = actorContainer.querySelector('.attribute-modifier');

    if (modifier) modifier.textContent = mod;
  } else {
    console.log(`Element with ID ${id} not found.`);
  }
}
function updateActorContainer(id, name, attrName, attrValue, imgSrc) {
  const versusContainer = document.getElementById('versus');
  const actorContainer = document.getElementById(id);

  console.log('attrValue', attrValue);
  if (actorContainer) {
    const actorName = actorContainer.querySelector('.actor-name');
    const attributeName = actorContainer.querySelector('.attribute-name');
    const attributeValue = actorContainer.querySelector('.attribute-value');
    const actorImage = versusContainer.querySelector(id === 'actor1' ? '.actor1-image' : '.actor2-image');

    if (actorName) actorName.textContent = name;
    if (attributeName) attributeName.textContent = attrName;
    if (attributeValue) attributeValue.textContent = attrValue;
    if (actorImage) {
      actorImage.innerHTML = `<img src="${imgSrc}" alt="${name}" style="width: 70px; height: 70px; border-radius: 50%;">`;
    }
  } else {
    console.log(`Element with ID ${id} not found.`);
  }
}
