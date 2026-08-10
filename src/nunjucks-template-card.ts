import { LitElement, html, customElement, property, TemplateResult, PropertyValues, state } from 'lit-element';
import deepClone from 'deep-clone-simple';
import { computeCardSize, HomeAssistant, LovelaceCard } from 'custom-card-helpers';
import { hasTemplate, renderTemplate } from 'ha-nunjucks';

import { NunjucksTemplateConfig } from './types';
import { CARD_VERSION } from './const';

/* eslint no-console: 0 */
console.info(
  `%c  NUNJUCKS-TEMPLATE-CARD  \n%c  Version ${CARD_VERSION}         `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

@customElement('nunjucks-template-card')
export class NunjucksTemplateCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: NunjucksTemplateConfig;
  @state() private _helpers?: any;
  private _initialized = false;

  public setConfig(config: NunjucksTemplateConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (!config.card && !config.row && !config.element) {
      throw new Error('No card or row or element defined');
    }

    if (config.card && !config.card.type) {
      throw new Error('No card type defined');
    }

    if (config.card && config.card.type === 'picture-elements') {
      console.warn(
        'WARNING: nunjucks-template-card should not be used with the picture-elements card itself. Instead use it as one of the elements. Check the README for details',
      );
    }

    if (config.element && !config.element.type) {
      throw new Error('No element type defined');
    }

    if (!config.entities) {
      throw new Error('No entities defined');
    }

    this._config = config;

    this.loadCardHelpers();
  }

  private getLovelacePanel() {
    const ha = document.querySelector("home-assistant");

    if (ha && ha.shadowRoot) {
      const haMain = ha.shadowRoot.querySelector("home-assistant-main");

      if (haMain && haMain.shadowRoot) {
        return haMain.shadowRoot.querySelector('ha-panel-lovelace');
      }
    }

    return null
  }

  private getLovelaceConfig() {
    const panel = this.getLovelacePanel() as any;

    if (panel && panel.lovelace && panel.lovelace.config && panel.lovelace.config.nunjucks_template_card_vars) {
      return panel.lovelace.config.nunjucks_template_card_vars
    }

    return {}
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    if (changedProps.has('_config')) {
      return true;
    }

    if (this._config) {
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

      if (oldHass) {
        for (const entity of this._config.entities) {
          const evaluatedTemplate = this._evaluateTemplate(entity);
          if (Boolean(this.hass && oldHass.states[evaluatedTemplate] !== this.hass.states[evaluatedTemplate])) {
            return true;
          }
        }
        return false;
      }
    }

    return true;
  }

  public getCardSize(): number | Promise<number> {
    if (this.shadowRoot) {
      const element = this.shadowRoot.querySelector('#card > *') as LovelaceCard;
      if (element) {
        console.log('computeCardSize is ' + computeCardSize(element));
        return computeCardSize(element);
      }
    }

    return 1;
  }

  protected render(): TemplateResult | void {
    if (
      !this._config ||
      !this.hass ||
      !this._helpers ||
      (!this._config.card && !this._config.row && !this._config.element)
    ) {
      return html``;
    }

    let config = this._config.card
      ? deepClone(this._config.card)
      : this._config.row
      ? deepClone(this._config.row)
      : deepClone(this._config.element);

    let style = this._config.style ? deepClone(this._config.style) : {};

    config = this._evaluateConfig(config);
    if (style) {
      style = this._evaluateConfig(style);
    }

    const element = this._config.card
      ? this._helpers.createCardElement(config)
      : this._config.row
      ? this._helpers.createRowElement(config)
      : this._helpers.createHuiElement(config);
    element.hass = this.hass;

    if (this._config.element) {
      if (style) {
        Object.keys(style).forEach(prop => {
          this.style.setProperty(prop, style[prop]);
        });
      }
      if (config.style) {
        Object.keys(config.style).forEach(prop => {
          element.style.setProperty(prop, config.style[prop]);
        });
      }
    }

    return html`
      <div id="card">
        ${element}
      </div>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private _evaluateConfig(config: any): any {
    Object.entries(config).forEach(entry => {
      const key = entry[0];
      const value = entry[1];

      if (value !== null) {
        if (value instanceof Array) {
          config[key] = this._evaluateArray(value);
        } else if (typeof value === 'object') {
          config[key] = this._evaluateConfig(value);
        } else if (typeof value === 'string' && hasTemplate(value)) {
          config[key] = this._evaluateTemplate(value);
        }
      }
    });

    return config;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private _evaluateArray(array: any): any {
    for (let i = 0; i < array.length; ++i) {
      const value = array[i];
      if (value instanceof Array) {
        array[i] = this._evaluateArray(value);
      } else if (typeof value === 'object') {
        array[i] = this._evaluateConfig(value);
      } else if (typeof value === 'string' && hasTemplate(value)) {
        array[i] = this._evaluateTemplate(value);
      }
    }

    return array;
  }

  private _evaluateTemplate(template: string): any {
    if (!hasTemplate(template) || !this.hass) {
      return template;
    }

    return renderTemplate(this.hass as any, template, this._buildContext());
  }

  private _buildContext(): { vars: any[] & { [key: string]: any } } {
    const arrayVars: string[] = [];
    const namedVars: { [key: string]: string } = {};

    if (this._config) {
      if (Array.isArray(this._config.variables)) {
        arrayVars.push(...this._config.variables);
      } else {
        Object.assign(namedVars, this._config.variables);
      }
    }

    const localVars = this.getLovelaceConfig();

    if (localVars) {
      if (Array.isArray(localVars)) {
        arrayVars.push(...localVars);
      } else {
        Object.assign(namedVars, localVars);
      }
    }

    const context: { vars: any[] & { [key: string]: any } } = { vars: [] };

    arrayVars.forEach(v => {
      context.vars.push(hasTemplate(v) ? renderTemplate(this.hass as any, v, context) : v);
    });

    Object.entries(namedVars).forEach(([varName, value]) => {
      const newV = hasTemplate(value) ? renderTemplate(this.hass as any, value, context) : value;
      context.vars[varName] = newV;
      context[varName] = newV;
    });

    return context;
  }
}
