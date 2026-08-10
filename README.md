# Nunjucks Template Card

📝 Templatable Configuration Card

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

[![Discord][discord-shield]][discord]
[![Community Forum][forum-shield]][forum]

[![Twitter][twitter]][twitter]
[![Github][github]][github]

This card is for [Lovelace](https://www.home-assistant.io/lovelace) on [Home Assistant](https://www.home-assistant.io/) that allows you to template your card, row, or element configuration using [Jinja2-like Nunjucks templates](https://mozilla.github.io/nunjucks/templating.html), powered by [ha-nunjucks](https://github.com/Nerwyn/ha-nunjucks). Templates are rendered synchronously on the frontend using the `hass` object, so they behave like Home Assistant's own Jinja2 templates without needing the backend.

## Minimum Home Assistant Version

Home Assistant version 0.110.0 or higher is required as of release 1.2.0 of nunjucks-template-card

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/zJtVxUAgH)

## Installation

Use [HACS](https://hacs.xyz) or follow this [guide](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins)

```yaml
resources:
  - url: /local/nunjucks-template-card.js
    type: module
```

## Options

| Name      | Type   | Requirement  | Description                                                                                                      |
| --------- | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| type      | string | **Required** | `custom:nunjucks-template-card`                                                                                  |
| entities  | list   | **Required** | List of entity strings that should be watched for updates. Templates can be used here                            |
| variables | list   | **Optional** | List of variables, which can be templates, that can be used in your `config` and indexed using `vars` or by name |
| card      | object | **Optional** | Card configuration. (A card, row, or element configuaration must be provided)                                    |
| row       | object | **Optional** | Row configuration. (A card, row, or element configuaration must be provided)                                     |
| element   | object | **Optional** | Element configuration. (A card, row, or element configuaration must be provided)                                 |
| style     | object | **Optional** | Style configuration.                                                                                             |

### Available variables for templating

Templates are rendered with [ha-nunjucks](https://github.com/Nerwyn/ha-nunjucks), so anything documented there is available here, including all of the [Home Assistant template functions](https://www.home-assistant.io/template-functions/) (`states()`, `is_state()`, `state_attr()`, `now()`, etc.) and the `hass` object itself.

| Variable | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hass`   | The [hass](https://developers.home-assistant.io/docs/frontend/data/) object, e.g. `hass.states['light.bed_light'].state` or `hass.user`                                                                                                                                                                                                                                                             |
| `vars`   | Defined by `variables` configuration and accessible in your templates to help clean them up. If `variables` in the configuration is a yaml list, then `vars` is an array starting at the 0th index as your firstly defined variable. If `variables` is an object in the configuration, then `vars` is a string-indexed map and you can also access the variables by name without using `vars` at all. |

Each entry in `variables` is itself a template that is rendered before your `card`/`row`/`element`/`style` templates, so its resolved value in `vars` is always a string (or boolean). If you need to pull multiple fields off of an entity, do it within a single variable's template, e.g. `hass.states['sensor.light'].entity_id`, rather than storing the whole state object.

## Examples

```yaml
type: 'custom:nunjucks-template-card'
variables:
  LIGHT_STATE: "{{ states('light.bed_light') }}"
  GARAGE_STATE: "{{ states('cover.garage_door') }}"
entities:
  - light.bed_light
  - cover.garage_door
  - alarm_control_panel.alarm
  - climate.ecobee
card:
  type: "{{ 'glance' if LIGHT_STATE == 'on' else 'entities' }}"
  entities:
    - entity: alarm_control_panel.alarm
      name: "{{ 'Close the garage!' if GARAGE_STATE == 'open' and is_state('alarm_control_panel.alarm', 'armed_home') else '' }}"
    - entity: binary_sensor.basement_floor_wet
    - entity: climate.ecobee
      name: "{{ 'Cozy' if state_attr('climate.ecobee', 'current_temperature') | float > 22 else 'Too Hot/Cold' }}"
    - entity: cover.garage_door
    - entity: "{{ 'light.bed_light' if LIGHT_STATE == 'on' else 'climate.ecobee' }}"
      icon: "{{ 'mdi:hotel' if GARAGE_STATE == 'open' else '' }}"
```

### Templated entities example

```yaml
type: 'custom:nunjucks-template-card'
variables:
  - "{{ hass.states['sensor.light'].entity_id }}"
entities:
  - '{{ vars[0] }}'
card:
  type: light
  entity: '{{ vars[0] }}'
  name: "{{ 'Light On' if is_state(vars[0], 'on') else 'Light Off' }}"
```

### Picture-elements card example

```yaml
type: picture-elements
image: http://hs.sbcounty.gov/CN/Photo%20Gallery/_t/Sample%20Picture%20-%20Koala_jpg.jpg?Mobile=0
elements:
  - type: 'custom:nunjucks-template-card'
    variables:
      - "{{ states('light.bed_light') }}"
    entities:
      - light.bed_light
      - sensor.light_icon_color
    element:
      type: icon
      icon: "{{ 'mdi:home' if vars[0] == 'on' else 'mdi:circle' }}"
      style:
        '--paper-item-icon-color': '{{ states("sensor.light_icon_color") }}'
    style:
      top: 47%
      left: 75%
```
The `style` object on the element configuration is applied to the element itself, the `style` object on the `nunjucks-template-card` is applied to the surrounding card, both can contain templated values. For example, in order to place the card properly, the `top` and `left` attributes must always be configured on the `nunjucks-template-card`.

### Entities card example

```yaml
type: entities
entities:
  - type: 'custom:nunjucks-template-card'
    variables:
      - "{{ states('light.bed_light') }}"
    entities:
      - light.bed_light
    row:
      type: section
      label: "{{ 'Light On' if vars[0] == 'on' else 'Light Off' }}"
  - entity: light.bed_light
```

## Dashboard wide variables

If you need to use the same variable in multiple cards, then instead of defining it in each card's `variables` you can do that once for the entire dashboard.

```yaml
title: My dashboard

nunjucks_template_card_vars:
  - "{{ states('sensor.light') }}"

views:
```

Both arrays and objects are supported, just like in card's local variables. It is allowed to mix the two types, i.e. use an array in dashboard variables and an object in card variables, or the other way around. If both definitions are arrays, then dashboard variables are put first in `vars`. In the mixed mode, `vars` have array indices and as well as variable names.

### Note: All templates must be enclosed by `{{ }}` or `{% %}`, following [Nunjucks](https://mozilla.github.io/nunjucks/templating.html)/Jinja2 syntax. Plain Javascript `${}` templates are no longer supported.

[Troubleshooting](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins)

## Credits

This card is based on [config-template-card](https://github.com/iantrich/config-template-card) by [Ian Richardson (@iantrich)](https://github.com/iantrich), which pioneered templatable Lovelace card, row, and element configuration. This fork renames the project and swaps the original JavaScript `${}` template evaluation for Jinja2-style templates rendered with [ha-nunjucks](https://github.com/Nerwyn/ha-nunjucks) by [@Nerwyn](https://github.com/Nerwyn).

## Developers

Fork and then clone the repo to your local machine. From the cloned directory run

`npm install && npm run build`

[commits-shield]: https://img.shields.io/github/commit-activity/y/custom-cards/config-template-card.svg?style=for-the-badge
[commits]: https://github.com/custom-cards/config-template-card/commits/master
[discord]: https://discord.gg/Qa5fW2R
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/t/100-templatable-lovelace-configuration-card/105241
[license-shield]: https://img.shields.io/github/license/custom-cards/config-template-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/badge/maintainer-Ian%20Richardson%20%40iantrich-blue.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/custom-cards/config-template-card.svg?style=for-the-badge
[releases]: https://github.com/custom-cards/config-template-card/releases
[twitter]: https://img.shields.io/twitter/follow/iantrich.svg?style=social
[github]: https://img.shields.io/github/followers/iantrich.svg?style=social
