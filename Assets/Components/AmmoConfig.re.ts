import * as RE from 'rogue-engine';
import { AmmoPhysics } from '../Classes/AmmoPhysics';

export default class AmmoConfig extends RE.Component {
  start() {
    AmmoPhysics.init().catch(e => {
      RE.Debug.logError(e);
    });
  }
}

RE.registerComponent(AmmoConfig);
