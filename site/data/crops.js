// Reference thresholds per crop. `need` is the soil moisture below which the crop
// should be watered, in two units: volumetric % (demo data) and % saturation
// (NASA POWER GWETTOP). Values are rule-of-thumb guides for the demo, not agronomy advice.

export const CROPS = {
  rice: { need: { vol: 40, sat: 75 }, method: 'drip', texture: 'rows' },
  coffee: { need: { vol: 28, sat: 55 }, method: 'drip', texture: 'trees' },
  veg: { need: { vol: 32, sat: 62 }, method: 'sprinkler', texture: 'beds' },
  fruit: { need: { vol: 30, sat: 58 }, method: 'drip', texture: 'trees' },
}

export const CROP_IDS = Object.keys(CROPS)
