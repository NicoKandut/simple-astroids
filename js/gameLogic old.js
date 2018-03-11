var gameLogic = (function () {
    var isVerbose;

    var canvas;
    var ctx;

    var nextID = 0;
    var player;
    var obstacles;
    var bullets;
    var powerUp;
    var powerUps;
    var level = 0;

    var keysDown = {};
    var mouse = {};

    var then = -1;

    var points = 0;

    var pointsDisplay;
    var healthDisplay;
    var bombDisplay;
    var rocketDisplay;
    var weaponDisplay;
    var scores;

    var gameLogic = {
        start: _start
    };

    //Setup
    function _start(verbose) {
        isVerbose = verbose;
        document.addEventListener("DOMContentLoaded", function () {
            setupCanvas();
            setupGameObjects();
            attachInputHandlers();
            nextLevel();
            loop();
        });
    }

    function reset() {
        var score = document.createElement('li');
        score.innerHTML = document.getElementById('name').value + ' - ' + points;
        scores.appendChild(score);

        player = newPlayer();
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        bullets = [];
        level = 0;
        points = 0;
        nextLevel();
    }

    function nextLevel() {
        level++;
        healthDisplay.firstChild.nodeValue = player.health + ' HEARTS';
        bombDisplay.firstChild.nodeValue = player.bombs + ' BOMBS';
        rocketDisplay.firstChild.nodeValue = player.rockets + ' ROCKETS';
        weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
        obstacles = generateObstacles(level * 10);
        powerUp = newPowerUp(random(15, canvas.width - 15), random(15, canvas.height - 15));
        log('Reached Level ' + level);
    }

    function setupCanvas() {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        canvas.width = 1920 / 2;
        canvas.height = 1080 / 2;
        canvas.style.backgroundColor = '#333333'
        document.getElementById('main').appendChild(canvas);
    }

    function setupGameObjects() {
        player = newPlayer();
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        bullets = [];
        powerUps = ['BOUNCE', 'ROCKET', 'BOMB', 'HEART', 'REGULAR', 'PIERCE', 'CHARGE', 'POISON', 'PARA'];

        healthDisplay = document.getElementById('hp');
        pointsDisplay = document.getElementById('pts');
        bombDisplay = document.getElementById('bombs');
        rocketDisplay = document.getElementById('rockets');
        weaponDisplay = document.getElementById('primary');
        scores = document.getElementById('scores');
    }

    function generateObstacles(count) {
        var obs = [];
        for (var i = 0; i < count; i++) {
            var obstacle;
            do {
               var size = random(10, 45);
               obstacle = newObstacle(random(0 + size, canvas.width - size), random(0 + size, canvas.height - size), size);
            } while (distanceBetween(player, obstacle) < player.size + obstacle.size + 50);
            obs.push(obstacle);
        }

        return obs;
    }


    //Constructors
    function newPlayer(posX, posY) {
        return {
            id: getID(),
            x: 0,
            y: 0,
            size: 10,
            health: 3,
            lasthit: -1,
            primary: 'REGULAR',
            weaponlevel: 1,
            rockets: 10,
            bombs: 5,
            speed: 200,
            accuracy: 0.9,
            shotspeed: 0.1,
            bulletspeed: 350,
            bigbulletinterval: 5,
            lastshot: -1,
            lastrocket: -1,
            lastbomb: -1,
            charging: undefined,
            chargedEnergy: 0,
            maxCharge: 20
        };
    }

    function newObstacle(posX, posY, size) {
        return {
            id: getID(),
            x: posX,
            y: posY,
            size: size,
            value: size * 10,
            movement: {
                x: 0,
                y: 0
            }
        };
    }

    function newEnemy(posX, posY) {
        enemy = {
            id: getID(),
            x: posX,
            y: posY,
            size: 10,
            value: 1000,
            lastshot: -1,
            movement: {
                x: 0,
                y: 0
            }
        };
        return enemy;
    }

    function newPowerUp(posX, posY) {
        return {
            id: getID(),
            x: posX,
            y: posY,
            size: 15,
            type: powerUps[random(0, powerUps.length - 1)]
        };
    }

    function newBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'REGULAR',
            x: posX,
            y: posY,
            size: ID % player.bigbulletinterval === 0 ? 5 * (player.weaponlevel + 1) / 2 : 2 * (player.weaponlevel + 1) / 2,
            damage: ID % player.bigbulletinterval === 0 ? 10 * (player.weaponlevel + 1) / 2 : 2 * (player.weaponlevel + 1) / 2,
            movement: vector
        };
    }

    function newBullet(posX, posY, type, vector) {
        var ID = getID();
        var bullet = {
            id: ID,
            type: type,
            x: posX,
            y: posY,   
            movement: vector,
            created: Date.now()
        };

        switch (type) {
            case 'REGULAR':
                bullet.size = ID % player.bigbulletinterval === 0 ? 5 * (player.weaponlevel + 1) / 2 : 2 * (player.weaponlevel + 1) / 2;
                bullet.damage = bullet.size === 2 ? 2 * (player.weaponlevel + 1) / 2 : 10 * (player.weaponlevel + 1) / 2;
                break;
            case 'BOUNCE':
                bullet.size = 3 * (player.weaponlevel + 1) / 2;
                bullet.damage = 3 * (player.weaponlevel + 1) / 2;
                bullet.bounces = 5;
                break;
            case 'PIERCE':
                bullet.size = 1 * (player.weaponlevel + 1) / 2;
                bullet.damage = 5 * (player.weaponlevel + 1) / 2;
                bullet.pierces = 5;
                bullet.immune = [];
                break;
            case 'POISON':
                bullet.size = 4 * (player.weaponlevel + 1) / 2;
                bullet.damage = 1 * (player.weaponlevel + 1) / 2;
                break;
            case 'PARA':
                bullet.size = 6 * (player.weaponlevel + 1) / 2;
                bullet.damage = 3 * (player.weaponlevel + 1) / 2;
                break;
            case 'BOMB':
                bullet.size = 2;
                bullet.damage = 2;
                break;
            case 'CHARGED':
                bullet.size = 2;
                bullet.damage = 2;
                break;
            default:
                throw 'Unknown bullet type...';
        }

        return bullet;
    }

    function newBounceBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'BOUNCE',
            x: posX,
            y: posY,
            size: 3 * (player.weaponlevel + 1) / 2,
            damage: 3 * (player.weaponlevel + 1) / 2,
            movement: vector,
            bounces: 5
        };
    }

    function newPierceBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'PIERCE',
            x: posX,
            y: posY,
            size: 1 * (player.weaponlevel + 1) / 2,
            damage: 5 * (player.weaponlevel + 1) / 2,
            movement: vector,
            pierce: 5,
            immune: []
        };
    }

    function newPoisonBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'POISON',
            x: posX,
            y: posY,
            size: 4 * (player.weaponlevel + 1) / 2,
            damage: 1 * (player.weaponlevel + 1) / 2,
            movement: vector,
            created: Date.now()
        };
    }

    function newParaBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'PARA',
            x: posX,
            y: posY,
            size: 6 * (player.weaponlevel + 1) / 2,
            damage: 3 * (player.weaponlevel + 1) / 2,
            movement: vector,
            created: Date.now()
        };
    }

    function newRocket(posX, posY, vector, target) {
        var ID = getID();
        return {
            id: ID,
            type: 'ROCKET',
            x: posX,
            y: posY,
            size: 5,
            damage: 100,
            movement: vector,
            target: target,
            created: Date.now()
        };
    }

    function newBombBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'BOMB',
            x: posX,
            y: posY,
            size: 2,
            damage: 2,
            movement: vector
        };
    }

    function newChargedBullet(posX, posY, vector) {
        var ID = getID();
        return {
            id: ID,
            type: 'CHARGED',
            x: posX,
            y: posY,
            size: 2,
            damage: 2,
            movement: vector
        };
    }

    //Input
    function attachInputHandlers() {
        addEventListener("keydown", function (e) {
            keysDown[e.keyCode] = true;
        }, false);

        addEventListener("keyup", function (e) {
            delete keysDown[e.keyCode];
        }, false);

        addEventListener("mousemove", trackMouse, false);
    }

    function trackMouse(e) {
        var pos = element_position(canvas);
        mouse.x = e.clientX - pos.x;
        mouse.y = e.clientY - pos.y;
    }


    //Loop
    function loop() {
        var now = Date.now();
        var delta = now - then;

        update(delta / 1000);
        render();

        then = now;

        requestAnimationFrame(loop);
    }


    //Update
    function update(delta) {
        if (player.health <= 0) {
            reset();
            return;
        }
        var vector = {
            x: 0,
            y: 0
        };
        var shooting = false;
        var rocket = false;
        var bomb = false;
        var charging = false;
        var bounce = false;

        if (40 in keysDown || 83 in keysDown) {
            vector.y += 1;
        }
        if (38 in keysDown || 87 in keysDown) {
            vector.y -= 1;
        }
        if (37 in keysDown || 65 in keysDown) {
            vector.x -= 1;
        }
        if (39 in keysDown || 68 in keysDown) {
            vector.x += 1;
        }
        if (16 in keysDown) {
            charging = true;
        }
        //else if (70 in keysDown) {
        //    bounce = true;
        //}
        else if (32 in keysDown) {
            shooting = true
        }
        if (81 in keysDown) {
            rocket = true;
        }
        if (69 in keysDown) {
            bomb = true;
        }

        if ((vector.x !== 0 || vector.y !== 0)) {
            vector = normalize(vector, player.speed * delta);
            if (validMove(vector)) {
                player.x += vector.x;
                player.y += vector.y;
            }
        }
        if (shooting && canShoot('BULLET') && !player.charging) {
            if (player.primary === 'REGULAR') {
                shootBullet('REGULAR');
            }
            else if (player.primary === 'BOUNCE') {
                //shootBounceBullet();
                shootBullet('BOUNCE');
            } 
            else if (player.primary === 'PIERCE') {
                //shootPierceBullet();
                shootBullet('PIERCE');
            } 
            else if (player.primary === 'POISON') {
                //shootPoisonBullet();
                shootBullet('POISON');
            } 
            else if (player.primary === 'PARA') {
                //shootParaBullet();
                shootBullet('PARA');
            } 
        }       
        if (rocket && player.rockets > 0 && canShoot('ROCKET')) {
            shootRocket();
        }
        if (bomb && player.bombs > 0 && canShoot('BOMB')) {
            shootBomb();
        }
        if (charging) {
            if (player.charging === undefined) {
                player.charging = createChargedBullet();
            }
            if (player.charging.size < player.maxCharge) {
                player.charging.size += player.maxCharge / 250;
                player.charging.damage += player.maxCharge / 250;
            }
        }
        if (player.charging !== undefined && !charging && canShoot('BULLET')) {
            shootChargedBullet();
        }

        updateBullets(delta);
        updateObstacles(delta);   

        if (obstacles.length === 0) {
            nextLevel();
        }
    }

    function shootBullet(type) {
        player.lastshot = Date.now();
        var mouseVector = getMouseVector();
        var bullet = newBullet(player.x, player.y, type, normalize(mouseVector, player.bulletspeed))
        bullets.push(bullet);
    }

    function shootBounceBullet() {
        player.lastshot = Date.now();
        var mouseVector = getMouseVector();
        var bullet = newBounceBullet(player.x, player.y, normalize(mouseVector, player.bulletspeed))
        bullets.push(bullet);
    }

    function shootPierceBullet() {
        player.lastshot = Date.now();
        var mouseVector = getMouseVector();
        var bullet = newPierceBullet(player.x, player.y, normalize(mouseVector, player.bulletspeed))
        bullets.push(bullet);
    }

    function shootPoisonBullet() {
        player.lastshot = Date.now();
        var mouseVector = getMouseVector();
        var bullet = newPoisonBullet(player.x, player.y, normalize(mouseVector, player.bulletspeed))
        bullets.push(bullet);
    }

    function shootParaBullet() {
        player.lastshot = Date.now();
        var mouseVector = getMouseVector();
        var bullet = newParaBullet(player.x, player.y, normalize(mouseVector, player.bulletspeed))
        bullets.push(bullet);
    }

    function shootRocket() {
        player.lastrocket = Date.now();
        player.rockets -= 1;
        for (var i = 0; i < 4; i++) {
            var target = obstacles[random(0, obstacles.length - 1)];
            var targetVector = getMouseVector();
            var bullet = newRocket(player.x, player.y, normalize(targetVector, player.bulletspeed), target);
            bullets.push(bullet);
        }
        rocketDisplay.firstChild.nodeValue = player.rockets + ' ROCKETS';
    }

    function shootBomb() {
        player.lastbomb = Date.now();
        player.bombs -= 1;
        for (var i = 0; i < 360; i += 3) {
            var vector = {
                x: Math.cos(i),
                y: Math.sin(i)
            };
            var bullet = newBombBullet(player.x, player.y, normalize(vector, player.bulletspeed), )
            bullets.push(bullet);
        } 
        bombDisplay.firstChild.nodeValue = player.bombs + ' BOMBS';
    }

    function createChargedBullet() {
        var bullet = newChargedBullet(player.x, player.y, { x: 0, y: 0 });
        bullets.push(bullet);
        return bullet;
    }

    function shootChargedBullet() {
        player.lastshot = Date.now();
        player.charging.movement = normalize(getMouseVector(), player.bulletspeed);
        player.charging = undefined;
    }

    function updateBullets(delta) {
        if (player.charging) {
            player.charging.x = player.x;
            player.charging.y = player.y;
        }
        for (var bullet of bullets) {
            if (bullet.type === 'ROCKET') {
                if (obstacles.length > 0 && !obstacles.some(function (value) {
                    return value.id === bullet.target.id;
                }))
                    bullet.target = obstacles[random(0, obstacles.length - 1)];
                var vector = normalize(getTargetVector(bullet, bullet.target), player.bulletspeed);
                var dif = Date.now() - bullet.created;
                bullet.movement.x = (bullet.movement.x * 10000 + vector.x * dif) / (10000 + dif);
                bullet.movement.y = (bullet.movement.y * 10000 + vector.y * dif) / (10000 + dif);
                bullet.x += bullet.movement.x * delta;
                bullet.y += bullet.movement.y * delta;
            }
            else if (bullet.type === 'PIERCE') {
                bullet.x += bullet.movement.x * delta * 2;
                bullet.y += bullet.movement.y * delta * 2;
            }
            else if (bullet.type === 'PARA') {
                var dif = Date.now() - bullet.created;
                dif = dif > 1000 ? 0 : 1000 - dif;
                bullet.x += bullet.movement.x * delta * dif / 1000;
                bullet.y += bullet.movement.y * delta * dif / 1000; 
            }
            else if (bullet.type === 'POISON') {
                var dif = Date.now() - bullet.created;
                bullet.x += bullet.movement.x * delta * dif / 1000;
                bullet.y += bullet.movement.y * delta * dif / 1000;
            }
            else {
                bullet.x += bullet.movement.x * delta;
                bullet.y += bullet.movement.y * delta;
            }
            if (outOfBounds(bullet, 'OUTSIDE')) {
                if (bullet.type === 'BOUNCE' && bullet.bounces > 0) {
                    bounce(bullet, bullet);
                    bullet.bounces--;
                }
                else {
                    hit(bullet);
                }            
            }
            for (var obstacle of obstacles) {
                if (distanceBetween(bullet, obstacle) < bullet.size + obstacle.size) {
                    hit(bullet, obstacle);
                }
            }
        }  
    }

    function updateObstacles(delta) {
        for (var obstacle of obstacles) {
            var newPos = {
                x: obstacle.x + obstacle.movement.x * delta,
                y: obstacle.y + obstacle.movement.y * delta,
                size: obstacle.size
            }

            if (outOfBounds(newPos, 'OUTSIDE')) {
                mirror(obstacle, newPos);
                //bounce(obstacle, newPos);
            }
            if (distanceBetween(player, obstacle) < player.size + obstacle.size) {
                var length = Math.sqrt(obstacle.movement.x * obstacle.movement.x + obstacle.movement.y * obstacle.movement.y);
                var vector = {
                    x: obstacle.x - player.x,
                    y: obstacle.y - player.y
                };
                vector = normalize(vector, length);
                var newMovement = {
                    x: obstacle.movement.x + vector.x,
                    y: obstacle.movement.y + vector.y
                };
                obstacle.movement = normalize(newMovement, length);
                damagePlayer();
            }
            if (obstacle.poisoned > 0) {
                obstacle.size -= obstacle.poisoned * delta * 5;
            }     

            if ((obstacle.movement.x !== 0 || obstacle.movement.y !== 0)) {
                obstacle.x += obstacle.movement.x * delta;
                obstacle.y += obstacle.movement.y * delta;
            }
            else {
                obstacle.movement = {
                    x: random(-100, 100),
                    y: random(-100, 100)
                }
            }
        } 

        for (var i = obstacles.length - 1; i >= 0; i--) {
            var obstacle = obstacles[i];
            if (obstacle.size < 10) {
                obstacles.splice(obstacles.indexOf(obstacle), 1);
                points += obstacle.value;
                pointsDisplay.firstChild.nodeValue = points + ' PTS';
            }
        }
    }

    function hit(bullet, target) {
        var damage = target !== undefined ? target.size : 9001
        if (target !== undefined) {
            if (bullet.type === 'PIERCE' && bullet.immune.indexOf(target) === -1) {
                target.size -= bullet.damage;
            }  
            else if (bullet.type !== 'PIERCE') {
                target.movement.x += bullet.movement.x * bullet.size / 10;
                target.movement.y += bullet.movement.y * bullet.size / 10;
                target.size -= bullet.damage;
            }

            if ((bullet.type === 'POISON')) {
                target.poisoned = bullet.damage;
            }
            if ((bullet.type === 'PARA')) {
                target.movement = { x: 0.00000000000000000000000000000001, y: 0.00000000000000000000000000000001};
            }

            if (target.size < 10) {
                obstacles.splice(obstacles.indexOf(target), 1);
                points += target.value;
                pointsDisplay.firstChild.nodeValue = points + ' PTS';
            }
        }

        if (bullet.type === 'PIERCE' && bullet.pierces > 0) {
            if (bullet.immune.indexOf(target) === -1) {
                bullet.pierces--;
                bullet.immune.push(target);
            }
        }
        else {
            bullet.size -= damage;
        }

        if (bullet.size <= 0) {
            bullets.splice(bullets.indexOf(bullet), 1);
        }
    }

    function bounce(object, newPos) {
        if (newPos.x - newPos.size < 0 || newPos.x + newPos.size > canvas.width) {
            object.movement.x *= -1;
        }
        if (newPos.y - newPos.size < 0 || newPos.y + newPos.size > canvas.height) {
            object.movement.y *= -1;
        }
    }

    function mirror(object, newPos) {
        if (newPos.x - newPos.size < 0 || newPos.x + newPos.size > canvas.width) {
            object.x = canvas.width - object.x;
        }
        if (newPos.y - newPos.size < 0 || newPos.y + newPos.size > canvas.height) {
            object.y = canvas.height - object.y;
        }
    }

    function getPowerUp() {
        if (player.primary === powerUp.type && ['REGULAR', 'BOUNCE', 'PIERCE', 'POISON', 'PARA'].indexOf(powerUp.type) !== -1) {
            player.weaponlevel++;
            weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
        }
        else {
            if (powerUp.type === 'ROCKET') {
                player.rockets++;
                rocketDisplay.firstChild.nodeValue = player.rockets + ' ROCKETS';
            }
            else if (powerUp.type === 'BOMB') {
                player.bombs++;
                bombDisplay.firstChild.nodeValue = player.bombs + ' BOMBS';
            }
            else if (powerUp.type === 'REGULAR') {
                player.weaponlevel = 1;
                player.primary = 'REGULAR';
                weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
            }
            else if (powerUp.type === 'BOUNCE') {
                player.weaponlevel = 1;
                player.primary = 'BOUNCE';
                weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
            }
            else if (powerUp.type === 'PIERCE') {
                player.weaponlevel = 1;
                player.primary = 'PIERCE';
                weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
            }
            else if (powerUp.type === 'PARA') {
                player.weaponlevel = 1;
                player.primary = 'PARA';
                weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
            }
            else if (powerUp.type === 'POISON') {
                player.weaponlevel = 1;
                player.primary = 'POISON';
                weaponDisplay.firstChild.nodeValue = player.primary + ' CANNON ' + player.weaponlevel;
            }
            else if (powerUp.type === 'HEART') {
                player.health++;
                healthDisplay.firstChild.nodeValue = player.health + ' HEARTS';
            }
            else if (powerUp.type === 'CHARGE') {
                player.maxCharge += 20;     
            }
        }
        //powerUp = undefined;
        powerUp = newPowerUp(random(15, canvas.width - 15), random(15, canvas.height - 15));
    }

    function damagePlayer() {
        if ((Date.now() - player.lasthit) / 1000 > 0.2) {
            player.health -= 1;
            healthDisplay.firstChild.nodeValue = player.health + ' HEARTS';
            player.lasthit = Date.now();
        }
    }


    //Collisions
    function validMove(vector) {
        var res = true;
        var newPosition = {
            x: player.x + vector.x,
            y: player.y + vector.y,
            size: player.size
        };
        if (outOfBounds(newPosition, 'INSIDE'))
            res = false;

        if (powerUp !== undefined && distanceBetween(newPosition, powerUp) < player.size + powerUp.size) {
            getPowerUp();
        }
        for (var obstacle of obstacles) {
            if (distanceBetween(newPosition, obstacle) < player.size + obstacle.size) {
                res = false;
                damagePlayer();
            }
        }

        return res;
    }

    function outOfBounds(object, type) {
        switch (type) {
            case 'INSIDE':
                return object.x - object.size < 0 || object.x + object.size > canvas.width || object.y - object.size < 0 || object.y + object.size > canvas.height;
            case 'OUTSIDE':
                return object.x + object.size < 0 || object.x - object.size > canvas.width || object.y + object.size < 0 || object.y - object.size > canvas.height;
        }
    }

    function distanceBetween(o1, o2) {
        var x = o1.x - o2.x;
        var y = o1.y - o2.y;
        return Math.sqrt(x * x + y * y);
    }


    //Canshoot
    function canShoot(type) {
        switch (type) {
            case 'BULLET':
                return (Date.now() - player.lastshot) / 1000 >= player.shotspeed;
            case 'ROCKET':
                return (Date.now() - player.lastrocket) / 1000 >= 0.5;
            case 'BOMB':
                return (Date.now() - player.lastbomb) / 1000 >= 0.3;
        }
        return false;
    }


    //Render
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPlayer();
        renderObstacles();
        renderBullets();
        renderPowerUp();
    }

    function renderPlayer() {
        ctx.strokeStyle = "#00FF22";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
    }

    function renderPowerUp() {
        if (powerUp) {
            if (powerUp.type === 'ROCKET')
                ctx.strokeStyle = '#FF6600';
            else if (powerUp.type === 'BOMB')
                ctx.strokeStyle = '#00AAFF';
            else if (powerUp.type === 'BOUNCE')
                ctx.strokeStyle = '#FF00FF';
            else if (powerUp.type === 'PIERCE')
                ctx.strokeStyle = '#7700FF';
            else if (powerUp.type === 'POISON')
                ctx.strokeStyle = '#008000';
            else if (powerUp.type === 'PARA')
                ctx.strokeStyle = '#00ffca';
            else if (powerUp.type === 'REGULAR')
                ctx.strokeStyle = '#0066FF';
            else if (powerUp.type === 'CHARGE')
                ctx.strokeStyle = '#FFFF00';
            else if (powerUp.type === 'HEART')
                ctx.strokeStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function renderObstacles() {
        
        for (var obstacle of obstacles) {
            if (!obstacle.poisoned) 
                ctx.strokeStyle = "#000000";
            else
                ctx.strokeStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function renderBullets() {
        for (var bullet of bullets) {
            if (bullet.type === 'REGULAR')
                ctx.strokeStyle = '#0066FF';
            else if (bullet.type === 'BOUNCE')
                ctx.strokeStyle = '#FF00FF';
            else if (bullet.type === 'PIERCE')
                ctx.strokeStyle = '#7700FF';
            else if (bullet.type === 'POISON')
                ctx.strokeStyle = '#008000';
            else if (bullet.type === 'PARA')
                ctx.strokeStyle = '#00ffca';
            else if (bullet.type === 'CHARGED')
                ctx.strokeStyle = '#FFFF00';
            else if (bullet.type === 'ROCKET')
                ctx.strokeStyle = '#FF6600';
            else if (bullet.type === 'BOMB')
                ctx.strokeStyle = '#00AAFF';
                       
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }


    //Helpers
    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getID() {
        return nextID++;
    }

    function log(text) {
        if (isVerbose)
            console.log(text);
    }

    function normalize(vector, length) {
        var hypo = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        return {
            x: vector.x / hypo * length,
            y: vector.y / hypo * length
        };
    }

    function element_position(e) {
        var x = 0, y = 0;
        do {
            x += e.offsetLeft;
            y += e.offsetTop;
        } while (e = e.offsetParent);
        return { x: x, y: y };
    }

    function getMouseVector() {
        return {
            x: mouse.x - player.x,
            y: mouse.y - player.y
        };
    }

    function getTargetVector(rocket, target) {   
        if (target) {
            return {
                x: target.x - rocket.x,
                y: target.y - rocket.y
            };
        }
        else {
            return getMouseVector();
        }
    }


    return gameLogic;
})();

gameLogic.start(true);