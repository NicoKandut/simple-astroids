var gameLogic = (function () {

    //Canvas
    var canvas;
    var ctx;

    //Input
    var kewdowns = {};
    var changed = false;

    //Time
    var then;

    //Score
    var score = 0;
    var scoreHTML;

    //FPS
    var fps = 60;
    var fpsHTML;

    //Mouse
    var cursorX;                                                                //Killing slows down the game
    var cursorY;  

    //Player
    var player;
    var defaultVelocity = 100;

    //Obstacles
    var obstacles = [];
    var numObstacles = 10;

    //Bullets
    var bullets = [];
    var nextID = 0;

    //gamelogic
    var gl = {
        start: _start,
        player: player,
        bullets: bullets,
        obstacles: obstacles
    };

    return gl;

    //Functions
    function _start() {
        document.addEventListener("DOMContentLoaded", function () {
            canvas = document.getElementById("display");
            ctx = canvas.getContext("2d");

            player = {
                x: canvas.width / 2,
                y: canvas.height / 2,
                size: 10,
                velocity: defaultVelocity,
                accuracy: 0.9,
                shotspeed: 0.2,
                bulletspeed: 5,
                bigbulletinterval: 1,
                lastshot: -1
            };
            fillObstacles();
            scoreHTML = document.getElementById("score");
            fpsHTML = document.getElementById("fps");

            document.onkeydown = handleInput;
            document.onkeyup = handleInput;
            document.onmousemove = trackMouse;

            then = Date.now();
            setInterval(update, 1000 / fps);
            window.requestAnimationFrame(render);
        });
    }
    function getID() {
        return nextID++;
    }
    function addScore(value) {
        score += value;
        //scoreHTML.innerHTML = score + " pts";
    }
    function element_position(e) {
        var x = 0, y = 0;
        do {
            x += e.offsetLeft;
            y += e.offsetTop;
        } while (e = e.offsetParent);
        return { x: x, y: y };
    }
    function trackMouse(e) {
        var pos = element_position(canvas);
        cursorX = e.clientX - pos.x;
        cursorY = e.clientY - pos.y;
    }

    function fillObstacles() {
        for (var i = 0; i < numObstacles; i++) {
            var o = new Obstacle(random(0, canvas.width), random(0, canvas.height), random(20, 50));
            obstacles.push(o);
        }
    }
    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function calcAccuracy() {
        return 1 + (Math.random() - 0.5) * (1 - player.accuracy);
    }

    //Update
    function update() {
        var now = Date.now();
        var delta = now - then;

        //Update
        updatePlayer(delta / 1000);
        updateObstacles();
        updateBullets(delta);

        //fpsHTML.innerHTML = (1000 / delta).toFixed(1) + " fps";

        then = now;
    }
    function render() {
        //render
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPlayer();
        renderObstacles();
        renderBullets();

        window.requestAnimationFrame(render);
    }

    function updatePlayer(delta) {
        for (var key in kewdowns) {
            if (kewdowns[key] === true) {
                if (String.fromCharCode(key) === ' ') {
                    tryShoot();
                }
                else {
                    move(String.fromCharCode(key), delta);
                }
            }
        }
    }

    function updateObstacles() {
        if (obstacles.length === 0) {
            numObstacles * 1.5;
            fillObstacles();
        }
    }

    function updateBullets(delta) {  
        var delBullets = [];
        for (var bullet of bullets) {
            if (outOfBounds(bullet)) {
                delBullets.push(bullet);
            }
            else {
                for (var obstacle of obstacles) {
                    if (distanceBetween(bullet, obstacle) < bullet.size + obstacle.size) {
                        obstacle.handleHit(bullet);
                        delBullets.push(bullet);
                    }
                    else {
                        bullet.move(delta);
                    }
                }
            }
        }
        for (var i = delBullets.length - 1; i >= 0; i--) {
            delBullets[i].handleImpact();
        }  
    }

    //move & shoot
    function move(key, delta) {
        var newPosition = {
            x: player.x,
            y: player.y
        };
        var distance = kewdowns['16'] === true ? player.velocity * 2 : player.velocity;
        switch (key) {
            case 'W':
                newPosition.y -= distance * delta;
                player.y = checkMovement(newPosition) ? newPosition.y : player.y;
                break;
            case 'A':
                newPosition.x -= distance * delta;
                player.x = checkMovement(newPosition) ? newPosition.x : player.x;
                break;
            case 'S':
                newPosition.y += distance * delta;
                player.y = checkMovement(newPosition) ? newPosition.y : player.y;
                break;
            case 'D':
                newPosition.x += distance * delta;
                player.x = checkMovement(newPosition) ? newPosition.x : player.x;
                break;
        }
        player.changed = true;
    }

    function tryShoot() {
        if ((Date.now() - player.lastshot) / 1000 > player.shotspeed) {
            shoot();
        }
    }

    function shoot() {
        var xSide = (cursorX - player.x) * calcAccuracy();
        var ySide = (cursorY - player.y) * calcAccuracy();
        var hypo = Math.sqrt(xSide * xSide + ySide * ySide);  

        var bullet = new Bullet(xSide / hypo, ySide / hypo);
        

        bullets.push(bullet);
        player.lastshot = Date.now();
    }

    //Drawing
    function renderPlayer() {
        ctx.strokeStyle = "#00FF22";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
    }

    function renderObstacles() {
        ctx.strokeStyle = "#000000";
        for (var obstacle of obstacles) {
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function renderBullets(target) {
        for (var bullet of bullets) {
            ctx.strokeStyle = bullet.size === 2 ? "#FF8800" : "#FF0000";
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function drawShoot() {      
        ctx.strokeStyle = "#FF0000";
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(cursorX, cursorY);
        ctx.stroke();
        ctx.strokeStyle = '#000000';
    }

    //Checking
    function checkMovement(newPosition) {
        var res = true;
        if (outOfBounds(newPosition))
            res = false;
        else
            for (var obstacle of obstacles)
                if (distanceBetween(newPosition, obstacle) < player.size + obstacle.size)
                    res = false;
        return res;
    }

    function distanceBetween(o1, o2) {
        var x = o1.x - o2.x;
        var y = o1.y - o2.y;
        return Math.sqrt(x * x + y * y);
    }

    function outOfBounds(o1) {
        var border = 0;
        return o1.x < border || o1.x > canvas.width - border || o1.y < border || o1.y > canvas.height - border;
    }

    //Handler
    function handleInput() {
        var inputKey = event.which;
        //if (inputKey === 87 || inputKey === 65 || inputKey === 83 || inputKey === 68 || inputKey === 32 || inputKey === 16) {
            if (event.type === 'keydown') {
                kewdowns[inputKey] = true;
            }
            else if (event.type === 'keyup') {
                delete kewdowns[inputKey];
            }
        //} 
    }

    //Classes
    function Obstacle(x, y, size) {
        this.id = getID();
        this.x = x;
        this.y = y;
        this.size = size;
        this.value = size;
        this.handleHit = function (bullet) {
            this.size -= bullet.damage;
            if (this.size <= 10) {
                obstacles.splice(obstacles.indexOf(this), 1);
                addScore(this.value);
            }
        };
    } 

    function Bullet(hori, vert) {
        this.id = getID();
        this.x = player.x;
        this.y = player.y;
        this.size = this.id % player.bigbulletinterval === 0 ? 4 : 2;
        this.damage = this.id % player.bigbulletinterval === 0 ? 10 : 1;
        
        this.horizontalVelocity = hori;
        this.verticalVelocity = vert;
        this.move = function (delta) {
            this.x += this.horizontalVelocity * delta * 0.01 * player.bulletspeed;// / (this.size / 2);
            this.y += this.verticalVelocity * delta * 0.01 * player.bulletspeed;// / (this.size / 2);
        };
        this.handleImpact = function () {
            bullets.splice(bullets.indexOf(this), 1);
        };
    }
})();

gameLogic.start();
