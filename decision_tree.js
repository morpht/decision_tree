/**
 * Class representing a Decision tree.
 */
class DecisionTree {
  'use strict';

  /**
   * Class constructor.
   *
   * @param id {string} representing id of HTML element.
   *
   */
  constructor(id) {
    // Validate steps and answers.
    this._validation(id);

    const steps = this._loadSteps(id);
    if (Array.isArray(steps)) {
      this.config = {id, first_step: steps[0], steps};

      // load all the steps available in DOM.
      this.storage = this._loadStorage(id);
      // Activate the decision tree.
      this.activate();
      // Track answer.
      document.querySelectorAll('#' + id + ' .step .step__answer')
      .forEach(function (answer) {
        if (answer.hasAttribute('href')) {
          answer.addEventListener('click', () => {
            this.trackAnswer(answer.attributes.href.value.replace('#', ''), answer.hasAttribute('data-answer-path') ? answer.attributes['data-answer-path'].value : false);
          })
        }
      }, this);
    } else {
      throw new Error('Please follow proper HTML structure.');
    }
  }

  /**
   * load all the steps of the active decision tree into config.
   */
  _loadSteps(id) {
    const steps = [];
    document
    .querySelector('#' + id)
    .querySelectorAll('.step')
    .forEach(function (el, index) {
      steps.push(el.id);
    })
    if (steps.length < 1) {
      console.warn('Decision tree should have at least one step.');
    }

    return steps;
  }

  /**
   * Validate the history of the active decision tree.
   */
  _validateHistory(storage) {
    // Reset history if it has legacy data/data which does not exist in DOM.
    const history = storage[this.config.id].history ?? '';
    const steps = this.config.steps ? this.config.steps : this._loadSteps(this.config.id);

    if (history.length > 0 && steps.length > 0) {
      const valid = history.every(function (val) {
        return steps.indexOf(val) !== -1;
      });
      if (valid === false) {
        storage[this.config.id].history = [this.config.first_step];
        storage[this.config.id].active = this.config.first_step;
        this.storage = storage;
        this._saveStorage();
      }
    }

    return storage;
  }

  /**
   * Load the active decision tree from local storage.
   */
  _loadStorage(id) {
    let storage = JSON.parse(localStorage.getItem(id)) || {};
    if (storage[this.config.id] !== undefined) {
      storage = this._validateHistory(storage);
      return storage[this.config.id];
    }
    return {
      first_step: this.config.first_step, active: this.config.first_step, history: [this.config.first_step]
    }
  }

  /**
   * Save the active decision tree to local storage.
   */
  _saveStorage() {
    let storage = JSON.parse(localStorage.getItem(this.config.id)) || {};
    storage[this.config.id] = this.storage;

    // Clean storage if it has empty data.
    if (!this.storage.active || !this.storage.history) {
      storage = {};
    }
    localStorage.setItem(this.config.id, JSON.stringify(storage));
  }

  /**
   * Basic HTML structure validation.
   */
  _validation(id) {
    const steps = document.querySelector('#' + id).querySelectorAll('.step');
    steps.forEach(function (el, index) {
      if (!el.hasAttribute('id')) {
        console.warn('One of your steps in decision tree with ID ' + id + ' does not have ID element filled.');
      }
    });

    // Every answer must have href and should have a data-answer-path.
    document.querySelector('#' + id).querySelectorAll('.step__answer').forEach(function (el, index) {
      if (!el.hasAttribute('href')) {
        console.warn('One of your answers in decision tree id ' + id + ' does not have href filled.');
      }
      if (!el.hasAttribute('data-answer-path')) {
        console.warn('One of your answers in decision tree id ' + id + ' does not have data-answer-path filled.');
      }
    });
  };

  _showSummary() {
    // clean HTML first.
    this._cleanHTML();

    const display_summary_in_step = document.querySelector('#' + this.config.id + ' #' + this.storage.active).hasAttribute('data-show-summary');
    if (this.storage.active) {
      // Show step info if there are no further questions.
      var furtherQuestions = document.querySelector('#' + this.config.id + ' #' + this.storage.active + ' .step__answer');

      if (furtherQuestions != null) {
        furtherQuestions = furtherQuestions.innerHTML.replace(/<\!--.*?-->/g, '').trim().length;
      }
    }

    if (furtherQuestions === 0 || furtherQuestions == null || display_summary_in_step) {
      // We are displaying summary in this step.
      this.show('#' + this.config.id + ' .decision-tree__summary');

      // Show step info.
      let infoHTML = '';
      if (this.storage.history) {
        // Copy history values to a local variable.
        const history = this.storage.history.slice();

        history.forEach((el) => {
          if (document.querySelector('#' + this.config.id + ' #' + el + ' .step__info')) {
            infoHTML += document.querySelector('#' + this.config.id + ' #' + el + ' .step__info').innerHTML;
          }
        });

        // Append info html into the step info extra.
        const summary_element = document.querySelector('#' + this.config.id + ' .decision-tree__summary');
        if (summary_element && summary_element.nodeType) {
          // In case of having infos element defined.
          if (summary_element.querySelector('.decision-tree__summary_infos') !== null) {
            summary_element.querySelector('.decision-tree__summary_infos').innerHTML = infoHTML;
          } else {
            const divElement = document.createElement('div');
            // Add the class 'decision-tree__summary_infos' to the div element.
            divElement.classList.add('decision-tree__summary_infos');
            // Set the innerHTML of the div element to the HTML string.
            divElement.innerHTML = infoHTML;
            // Insert the div element before the target element.
            summary_element.appendChild(divElement);
            // Filter results by start and stop parameters.
            this.filter();
          }
        } else {
          console.warn('Your decision tree with ID ' + this.config.id + ' does not have element with class decision-tree__summary.');
        }
      } else {
        this.hide('#' + this.config.id + ' .decision-tree__summary');
      }
    }
  }

  _cleanHTML() {
    // Clean HTML of all answers and remove styles.
    document.querySelectorAll('#' + this.config.id + ' .decision-tree__summary_infos *')
    .forEach(function (element) {
      element.remove();
    });

    document.querySelectorAll('#' + this.config.id + ' .decision-tree__summary').forEach((element) => {
      element.removeAttribute('style');
    });
  }

  /**
   * Show the active step of the active decision tree and store it to local
   * storage.
   */
  activate() {
    try {
      // Track step into google analytics.
      this.trackGA(this.storage.active + '/');

      // Hide all steps.
      document.querySelectorAll('#' + this.config.id + '.step').forEach((step) => {
        this.hide(step);
      })

      // Toggle footer.
      this.toggleFooter();

      if (!document.querySelector('#' + this.config.id + ' .decision-tree__summary')) {
        // Create a new div element
        const divElement = document.createElement('div');
        // Add the class 'decision-tree__summary' to the div element
        divElement.classList.add('decision-tree__summary');
        // Insert the div element before the target element
        document.querySelector('#' + this.config.id + ' .decision-tree__footer').prepend(divElement);
      }

      // Load current step.
      this.show('#' + this.config.id + ' #' + this.storage.active);

      // If it is a last step - show Summary.
      this._showSummary();

      // Filter results by start and stop parameters.
      this.filter();

      // Track back button.
      document.querySelector('#' + this.config.id + ' .decision-tree__footer .step__button--back').onclick = () => {
        this.trackBackButton();
      };

      // Track restart button.
      document.querySelector('#' + this.config.id + ' .decision-tree__footer .step__button--restart').onclick = () => {
        this.trackRestartButton();
      };

      // Add class to main div for better style targeting.
      document.querySelector('#' + this.config.id).classList.add('dt-initialized');

      // Save the storage.
      this._saveStorage();
    } catch (e) {
      this.hide('#' + this.config.id)
      console.warn('Cannot activate decision tree with ID ' + this.config.id + '. Incorrect HTML structure.');
    }
  }

  /**
   * Hide element.
   */
  hide(elem) {
    try {
      if (typeof elem === 'string') {
        elem = document.querySelector(elem);
      }
      if (elem && elem.nodeType) {
        elem.style.display = 'none';
        return true;
      }
    } catch (e) {
      console.warn('Please check decision tree with ID ' + this.config.id + '. Incorrect HTML structure.');
    }
    return false;
  }

  /**
   * Show element.
   */
  show(elem) {
    try {
      if (typeof elem === 'string') {
        elem = document.querySelector(elem);
      }
      if (elem && elem.nodeType) {
        elem.style.display = 'block';
        return true;
      }
    } catch (e) {
      console.warn('Please check decision tree ' + this.config.id + '. Incorrect HTML structure.');
    }
    return false;
  }

  /**
   * Filter results elements by start and stop parameters.
   */
  filter() {
    // Loop through list of all answers.
    document.querySelectorAll('#' + this.config.id + ' .decision-tree__summary li').forEach((info) => {
      // decision to display will be after validation of filters
      let show_step = true;
      if (info.hasAttribute('data-pass-filter')) {
        // If it has pass filter and that value is in array of answer display it or keep it displayed.
        const pass = info.attributes['data-pass-filter'].value.split(',');

        show_step = pass.every((and) => {
          return this.is_in_history(and.trim());
        })
      }

      if (info.hasAttribute('data-stop-filter')) {
        // If it has disable filter and that value is in array of answers then hide it.
        const stop = info.attributes['data-stop-filter'].value.split(',');

        stop.forEach((and) => {
          const result = this.is_in_history(and.trim());
          if (show_step === true && result === true) {
            show_step = false;
          }
        })
      }

      if (show_step === false) {
        this.hide(info);
      } else {
        this.show(info);
      }
    })
  }

  is_in_history(filter_array) {
    return filter_array.split(' ').every((object) => {
      return this.storage.history.includes(object);
    });
  }

  /**
   * Hide the active decision tree back and restart button if its first step.
   */
  toggleFooter() {
    if (!document.querySelector('#' + this.config.id + ' .decision-tree__footer')) {
      // Create a new div element.
      const divElement = document.createElement('div');
      // Add the class 'decision-tree__footer' to the div element.
      divElement.classList.add('decision-tree__footer');
      // Set the innerHTML of the div element to the HTML string.
      divElement.innerHTML = '<button class=\'step__button step__button--back\'>Back</button>\n<button class=\'step__button step__button--restart\'>Restart</button>';
      // Insert the div element before the target element.
      document.querySelector('#' + this.config.id).appendChild(divElement);
    }
    if (this.storage.history && this.storage.history.length > 1) {
      this.show('#' + this.config.id + ' .decision-tree__footer');
    } else {
      this.hide('#' + this.config.id + ' .decision-tree__footer');
    }
  }

  /**
   * Track the answer.
   */
  trackAnswer(nextStep, datakey) {
    // Track click on answer.
    if (datakey) {
      this.trackGA(this.storage.active + '/' + datakey);
    }

    // Hide current/active step.
    this.hide('#' + this.config.id + ' #' + this.storage.active);

    // Show next step.
    this.show('#' + this.config.id + ' #' + nextStep);

    // Track new step display.
    this.trackGA(nextStep + '/');

    // Make the next step as active.
    this.storage.active = nextStep;

    // Track history.
    this.storage.history.push(this.storage.active);

    // Save the storage.
    this._saveStorage(this.config.id);

    // Track the attribute.
    this.trackAttribute(nextStep);

    // Detect if we are on last step and then display summary.
    this._showSummary();

    // Toggle Footer.
    this.toggleFooter();
  }

  /**
   * Track the back button.
   */
  trackBackButton() {
    if (this.storage.history.length <= 1) {
      return;
    }

    // Hide current/active step.
    this.hide('#' + this.config.id + ' #' + this.storage.active);

    // Show previous step from history.
    const previousStep = this.storage.history[this.storage.history.length - 2];
    this.show('#' + this.config.id + ' #' + previousStep);

    // Track current step.
    this.trackGA(previousStep + '/back');

    // Hide Step info and empty step info extra and step info heading.
    this.hide('#' + this.config.id + ' #' + this.storage.active + ' .step__info');

    // Clean HTML from added elements.
    this._cleanHTML();

    // Make the next step as active.
    this.storage.active = previousStep;

    // Remove last step from history.
    this.storage.history.pop();

    // Save the storage.
    this._saveStorage();

    // Track the attribute.
    this.trackAttribute(this.storage.active);

    // Toggle Footer.
    this.toggleFooter();
  }

  /**
   * Track the restart button.
   */
  trackRestartButton() {
    // Hide current/active step.
    this.hide('#' + this.config.id + ' #' + this.storage.active);

    // Track the active step into google analytics.
    this.trackGA(this.storage.active + '/restart');

    // Make first step as active step.
    this.storage.active = this.config.first_step;

    // Show the first step.
    this.show('#' + this.config.id + ' #' + this.storage.active);

    // Send first step data to GA.
    this.trackGA(this.storage.active);

    // Wipe out history.
    this.storage.history = [this.config.first_step];

    // Save the storage.
    this._saveStorage();

    // Track the attribute.
    this.trackAttribute(this.storage.active);

    // Toggle Footer.
    this.toggleFooter();

    // Clean HTML from added elements.
    this._cleanHTML();
  }

  /**
   * Track attribute into local storage.
   */
  trackAttribute(id) {
    const step = document.querySelector('#' + this.config.id + ' #' + id);
    // Store the attribute.
    if (step != null) {
      if (step.hasAttribute('data-cookie')) {
        this.cookie(step.attributes['data-cookie'].value);
      }
    }
  }

  /**
   * Track pages via google analytics.
   */
  trackGA(path) {
    if (typeof gtag === 'function' && drupalSettings.google_analytics !== 'undefined') {
      gtag('config', drupalSettings.google_analytics.account, {page_path: window.location.href + this.config.id + '/' + path});
    } else if (typeof ga === 'function' && ga.getAll()[0].get('clientId') !== null && ga.getAll()[0].get('trackingId') !== null) {
      ga('create', ga.getAll()[0].get('trackingId'), {
        clientId: ga.getAll()[0].get('clientId')
      })
      ga('send', 'pageview', window.location.href + this.config.id + '/' + path);
    }
  }

  /**
   * Set cookie.
   */
  cookie(name, value, days) {
    let expires;

    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = ' expires=' + date.toGMTString();
    } else {
      expires = '';
    }
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + ' path=/ SameSite=None Secure';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize the decision tree object for all decision trees.
  document.querySelectorAll('.decision-tree').forEach(function (el) {
    if (el.hasAttribute('id')) {
      new DecisionTree(el.id);
    } else {
      console.warn('Decision tree does not have ID.');
    }
  });
}, false);
