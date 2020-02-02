import { game } from "../game"
import { Arc } from "../../api/Arc";
import { Food } from "../../api/Food";
import { Explosion } from "../../api/Explosion";
import { BouncyWall } from "../../api/BouncyWall";
import { PlayerEvents } from "../../api/PlayerEvents";
import * as GameMap from "../../api/GameMapConfig";
import { NetworkScene } from "./NetworkScene";
import { Player } from "../../api/Player";
import * as config from '../../server/config'
import * as socketio from 'socket.io-client'

export class MainScene extends NetworkScene {

    private player: Player
    private gameMapBounds: number[] = GameMap.settings.size

    public constructor() {
        super("MainScene")
    }

    public create(): void {
        this.initSocket()
        
        let step = GameMap.settings.gridStep

        for (let x: number = -this.gameMapBounds[0] / 2 + step / 2; x < this.gameMapBounds[0] / 2 + step / 2; x += step) {
            for (let y: number = -this.gameMapBounds[1] / 2 + step / 2; y < this.gameMapBounds[1] / 2 + step / 2; y += step) {
                this.add.rectangle(x, y, step, step).setStrokeStyle(2, Phaser.Display.Color.GetColor(4, 85, 163), 0.8)
            }
        }

        this.player = new Player(
            this.getSocket(),
            this,
            this.add.graphics(),
            new Phaser.GameObjects.Arc(
                this,
                Phaser.Math.Between(
                    GameMap.settings.playerSpawnCoordsRange[0],
                    GameMap.settings.playerSpawnCoordsRange[1]
                ),
                Phaser.Math.Between(
                    GameMap.settings.playerSpawnCoordsRange[0],
                    GameMap.settings.playerSpawnCoordsRange[1]
                ),
                GameMap.settings.playerRadius
            ).setFillStyle(GameMap.settings.playerColor),
            GameMap.settings.playerSpeed
        )

        this.cameras.main.setBounds(
            -this.gameMapBounds[0] / 2,
            -this.gameMapBounds[1] / 2,
            this.gameMapBounds[0],
            this.gameMapBounds[1]
        )

        this.cameras.main.startFollow(this.player.getShape(), true, 0.1, 0.1)

        PlayerEvents.initAll(this.player)

        this.player.spawnPlayer()
        this.player.updatePlayer()

        document.addEventListener("visibilitychange", () => { 
            if(document["hidden"]){
                this.player.disconnect()
                this.scene.start('SpectatorScene')

            } 
        })
          
    }
    public update(): void {
        this.pseudoUpdate(this.player, this.getSocket())
    }
    public pseudoUpdate(player: Player, socket: SocketIOClient.Socket): void {
        //console.log(this.game.loop.actualFps) ~LAST_CHECKED_GOOD

        player.move()
        player.updatePlayer()
        player.draw()

        for (let [otherPlayerSocketId, otherPlayer] of player.getOtherPlayers()) {
            //otherPlayer.move()
            if (!player.canSeeObject(otherPlayer)) {
                otherPlayer.getGraphics().clear()
                continue
            }
            if (player.collidesWith(otherPlayer)) {
                player.setVelocity(0, 0)
                player.updatePlayer()
            }
            otherPlayer.draw()
        }

        let objects: Arc[] = player.getObjects()
        for (let i: number = 0; i < objects.length; i++) {
            if (objects[i] == null || objects[i].getShape() == null) {
                continue
            }
            //interpolation
            objects[i].move()
            //player.updateObject(i, objects[i], socket)
            //interpolation
            if (player.canSeeObject(objects[i])) {
                objects[i].draw()
                if (!player.collidesWith(objects[i])) {
                    continue
                }
                objects[i].actTowards(player)
                player.updatePlayer()
                if (objects[i].getShape() != null) {
                    player.updateObject(i, objects[i])
                    continue
                }
                player.destroyObject(i)
                continue
            }
            objects[i].getGraphics().clear()
        }
        
        for (let i: number = 0; i < objects.length; i++) {
            if(objects[i] == null || objects[i].getShape() == null)
            {
                continue
            }
            for (let k: number = 0; k < objects.length; k++) {
                if(i == k || objects[k] == null || objects[k].getShape() == null){
                    continue
                }
                if(objects[i] instanceof Food && objects[k] instanceof Food){
                    continue
                }
                
                if(!objects[i].collidesWith(objects[k]))
                {
                    continue
                }
                
                objects[k].actTowards(objects[i], player)

                if (objects[k].getShape() != null) {
                    player.updateObject(k, objects[k])
                } else {
                    player.destroyObject(k)
                }

                if (objects[i].getShape() != null) {
                    player.updateObject(i, objects[i])
                    continue
                } 
                player.destroyObject(i)
                break
            }
        }
    }
}