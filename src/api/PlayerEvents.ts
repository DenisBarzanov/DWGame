import { Arc } from "./Arc"
import { Player } from "./Player"
import { game } from "../client/game";
import { Food } from "./Food";
import { BouncyWall } from "./BouncyWall";

export class PlayerEvents {

    private static onPointerMove(player: Player) : void
    {
        if(player == null){
            return
        }
        const transformedPoint: Phaser.Math.Vector2 = player.getScene().cameras.main.getWorldPoint(
            player.getScene().input.x, 
            player.getScene().input.y
        );

        if(new Phaser.Geom.Circle(player.getShape().x, player.getShape().y, player.getShape().radius)
            .contains(transformedPoint.x, transformedPoint.y)){
            player.setVelocity(0, 0)
            return;
        }
        let angle: number = Phaser.Math.Angle.Between(player.getShape().x, player.getShape().y, transformedPoint.x, transformedPoint.y)

        player.setVelocity(Math.cos(angle), Math.sin(angle))
    }
    private static onPointerMoveSpectator(player: Player) : void
    {
        if(player == null){
            return
        }
        const transformedPoint: Phaser.Math.Vector2 = player.getScene().cameras.main.getWorldPoint(
            player.getScene().input.x, 
            player.getScene().input.y
        );

        player.getShape().setPosition(transformedPoint.x, transformedPoint.y)
    }
    private static spawnPlayer(player: Player, socket: SocketIOClient.Socket) : void 
    {
        socket.on('spawnPlayer', (data: any) => {

            let scene: Phaser.Scene = player.getScene()
            let graphics: Phaser.GameObjects.Graphics = scene.add.graphics()
            let shape: Phaser.GameObjects.Arc = new Phaser.GameObjects.Arc(scene)
            let velocity: Phaser.Geom.Point = new Phaser.Geom.Point(data.vel.x, data.vel.y)

            shape.setPosition(data.x, data.y).setRadius(data.radius).setFillStyle(data.color)

            player.getOtherPlayers().set(
                data.id, 
                new Player(scene, graphics, shape, data.speed, data.id, velocity)
            )
        })
    }
    private static getConnectedPlayers(player: Player, socket: SocketIOClient.Socket) : void 
    {
        socket.on('getPlayer', (data: any) => {
            
            let otherPlayer = data.player
            let scene: Phaser.Scene = player.getScene()
            let graphics: Phaser.GameObjects.Graphics = scene.add.graphics()
            let shape: Phaser.GameObjects.Arc = new Phaser.GameObjects.Arc(scene)
            let velocity: Phaser.Geom.Point = new Phaser.Geom.Point(otherPlayer.vel.x, otherPlayer.vel.y)

            shape.setPosition(otherPlayer.x, otherPlayer.y).setRadius(otherPlayer.radius).setFillStyle(otherPlayer.color)
            player.getOtherPlayers().set(
                data.id, 
                new Player(scene, graphics, shape, otherPlayer.speed, otherPlayer.socketId, velocity)
            )
        })
    }
    private static updatePlayer(player: Player, socket: SocketIOClient.Socket) : void 
    {
        socket.on('updatePlayer', (data: any) => {

            if(!player.getOtherPlayers().has(data.id) || data.id == player.getSocketId()){
                return
            }

            let updatedPlayer: Player = player.getOtherPlayers().get(data.id)
            let updatedPlayerShape: Phaser.GameObjects.Arc = updatedPlayer.getShape()
            updatedPlayerShape.x = data.x
            updatedPlayerShape.y = data.y
            updatedPlayerShape.radius = data.radius
            updatedPlayerShape.fillColor = data.color
        })
    } 
    
    private static disconnectPlayer(player: Player, socket: SocketIOClient.Socket) : void 
    {
        socket.on('disconnectPlayer', (data: string) => {
            let deletedPlayer: Player = player.getOtherPlayers().get(data)

            deletedPlayer.destroy()

            player.getOtherPlayers().delete(data)
        })
    }
    private static spawnObject(player: Player, socket: SocketIOClient.Socket) : void
    {
        socket.on('spawnObject', (data: any) => {

            //console.log(`Client: received object at ${data.x}:${data.y}`)
            let scene = player.getScene()
            let objects: Arc[] = player.getObjects()

            if(data == null){
                objects.push(null)
                return
            }
            let color: number = Phaser.Display.Color.GetColor(data.color[0], data.color[1], data.color[2])
            
            let shape: Phaser.GameObjects.Arc = new Phaser.GameObjects.Arc (
                scene, 
                data.x, 
                data.y, 
                data.radius
            ).setFillStyle(color)

            data.randomNum ? 
                objects.push(new Food(scene, scene.add.graphics(), shape)) : 
                objects.push(new BouncyWall(scene, scene.add.graphics(), shape))
        })
    }
    private static updateObject(player: Player, socket: SocketIOClient.Socket) : void
    {
        socket.on('updateObject', (data: any) => {
            
            let objects: Arc[] = player.getObjects()

            if(!(objects[data.index] instanceof Arc) || objects[data.index].getShape() == null)
            {
                return
            }
            objects[data.index].setSpeed(data.speed)
            objects[data.index].setVelocity(data.vel.x, data.vel.y)
            objects[data.index].getShape().setPosition(data.x, data.y).setRadius(data.radius)
        })
    }
    private static destroyObject(player: Player, socket: SocketIOClient.Socket) : void
    {
        socket.on('destroyObject', (data: any) => {
            let objects: Arc[] = player.getObjects()
            if(objects[data.index] == null){
                return
            }
            objects[data.index].destroy()
        })
    }
    public static initAll(player: Player, socket: SocketIOClient.Socket) : void 
    {
        this.getConnectedPlayers(player, socket)
        this.spawnPlayer(player, socket)
        this.updatePlayer(player, socket)
        this.disconnectPlayer(player, socket)
        this.spawnObject(player, socket)
        this.updateObject(player, socket)
        this.destroyObject(player, socket)

        player.getScene().input.on('pointermove', () => this.onPointerMove(player))
    }

    public static initAllSpectator(player: Player, socket: SocketIOClient.Socket) : void 
    {
        this.getConnectedPlayers(player, socket)
        this.spawnPlayer(player, socket)
        this.updatePlayer(player, socket)
        this.disconnectPlayer(player, socket)
        this.spawnObject(player, socket)
        this.updateObject(player, socket)
        this.destroyObject(player, socket)

        player.getScene().input.on('pointermove', () => this.onPointerMoveSpectator(player))
    }

}