import React, { useEffect, useRef ,useState} from 'react';
import Phaser from 'phaser';
import { MainScene } from '../phaser/MainScene';

const GameCanvas = ({ players, mastermindId }) => {
  const phaserGameRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);

  // This effect runs once when the component mounts to initialize the Phaser game
  useEffect(() => {

    const onSceneReady = () => {
      setSceneReady(true);
    };

    const config = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: 'phaser-container',
      transparent: true,
      scene: [new MainScene(onSceneReady)],
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      setSceneReady(false);
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    };
  }, []); // Empty array ensures this runs only once

  // This "bridge" effect runs whenever the players or mastermindId props change
  useEffect(() => {
    const mainScene = phaserGameRef.current?.scene.scenes[0];
    if (sceneReady && mainScene) {
      mainScene.updatePlayerVisuals(players, mastermindId);
    }
  }, [players, mastermindId, sceneReady]);

  return <div id="phaser-container" style={{ width: '100%', height: '100%' }} />;
};

export default GameCanvas;