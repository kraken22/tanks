//Tank Object
function Tank(x, y, id) {
  //Setup Variables
  this.id = id;

  //physics variables
  this.x = x;
  this.y = y;
  this.xVel = 0;
  this.yVel = 0;

  this.speed = 1.8;
  this.dir = 0;
  this.gunDir = 0;

  //visual vairables
  this.name = name;
  this.col = myColor;
  this.size = 40;
  this.health = 100;
  this.bulletType = 3;

  this.gunReloaded = 0;
  this.landmineReloaded = 3000;
  this.amountOfLandmines = 1;
  this.tripodAmount = 0;
  this.blueBombAmount = 1;
  this.pulsesAmount = 2;

  this.deactivated = false;
  this.deactivatedTimer = 0;



  //images
  this.body = loadImage("/assets/"+this.col+"_body.png");
  // this.greyBody = loadImage("/assets/"+this.col+"_body_grey.png");
  this.gun  = loadImage("/assets/gun.png");

  //load correct images functions
  this.loadGun = function () {
    this.gun  = loadImage("/assets/gun.png");;
  }
  this.loadBody = function () {
    this.body = loadImage("/assets/"+this.col+"_body.png");
    // this.greyBody = loadImage("/assets/"+this.col+"_body_grey.png");
  }


  this.update = function () {
    if (this.health > 100) {
      this.health = 100;
    }

    //update physics
    this.x += this.xVel;
    this.y += this.yVel;

    this.xVel = 0;
    this.yVel = 0;

    //block going off the edge
    this.x = constrain(this.x, 0, width);
    this.y = constrain(this.y, 0, height);

    if (this == tank) {
      if (this.deactivatedTimer > 0) {
        this.deactivated = true;
        this.deactivatedTimer--;
      }else{
        this.deactivated = false;
      }
    }

    if(this.deactivated){
      return;
    }

    //reload gun
    if (this.tripodAmount > 3) {
      this.tripodAmount = 3;
    }
    this.gunReloaded --;
    this.landmineReloaded --;
    if(this.landmineReloaded < 0){
      this.landmineReloaded = 3000;
      this.amountOfLandmines ++;
    }

    //eat health packets
    for (var i = 0; i < healthPackets.length; i++) {
      if(dist(this.x, this.y, healthPackets[i].x, healthPackets[i].y)<healthPackets[i].size){
        this.health += 25;
        healthPackets.splice(i,1);
        socket.emit("remove_health_packet", i);
      }
    }

    //apply damage on hit
    for (var i = 0; i < bullets.length; i++) {
      if(dist(bullets[i].x, bullets[i].y, this.x, this.y)<this.size/2){
        this.health -= bullets[i].type; //subtract health
        explosions.push(new Explosion(bullets[i].x, bullets[i].y, bullets[i].size, 20, 1, color(255,150,0)));//make Explosion
        //check if we died
        this.checkDeath(bullets[i].owner.toLowerCase());

        //move tank on bullet hit
        if (bullets[i].type == 20) {
          this.x += 5*bullets[i].type*sin(bullets[i].dir);
          this.y -= 5*bullets[i].type*cos(bullets[i].dir);
        }else {
          this.x += 0.5*bullets[i].type*sin(bullets[i].dir);
          this.y -= 0.5*bullets[i].type*cos(bullets[i].dir);
        }
        bullets.splice(i,1);

      }
    }
  }

  this.checkDeath = function (killerName) {
    if(this.health <= 0){
      if(this == tank){ // if this tank is the users one
        this.health = 100;
        this.x = random(width);
        this.y = random(height);
        deathData = {
          name: this.name.toLowerCase(),
          killer: killerName
        }
        socket.emit("death", deathData);
        socket.emit("newWorld");
        this.deactivatedTimer = 600;
      }
    }
  }

  this.show = function () {
    if(this.deactivated){return;}

    push(); // save matrix
    imageMode(CENTER);
    translate(this.x, this.y);

    //show health bar
    noStroke()
    if (this.deactivated) {
      fill(120);
    }else{
      fill(map(this.health, 0, 100, 255, 0), map(this.health, 0, 100, 0, 255), 0);
    }
    rectMode(CENTER);
    rect(0, -35, map(this.health, 0, 100, 0, 35), 2);

    //show gun reloading bar
    if(this.gunReloaded >= 0){
      fill(100);
      rect(0, -30, map(this.gunReloaded, 0, 120, 0, 30), 1);
    }

    //show name
    fill(100);
    textSize(8);
    textAlign(CENTER);
    text(this.name, 0, -40);

    //show tank
    rotate(this.dir);
    if(this.deactivated){
      // image(this.greyBody, 0, 0, this.size, this.size);
    }else {
      image(this.body, 0, 0, this.size, this.size);
    }
    rotate(this.gunDir)
    image(this.gun, 0, -this.size/4, this.size, this.size)
    pop(); // reset to saved matrix
  }

  //fire bullets
  this.fire = function () {
    var bulletInfo = {
      x: this.x+22*sin(PI - this.dir - this.gunDir),
      y: this.y+22*cos(PI - this.dir - this.gunDir),
      dir: this.gunDir - PI+this.dir,
      owner: this.name,
      type: this.bulletType
    }
    // bullets.push(new Bullet(bulletInfo.x, bulletInfo.y, bulletInfo.dir)); //add this bullet to array
    socket.emit("shot", bulletInfo); //send new bullet data to server
  }

  //drop landmine
  this.dropLandmine = function () {
    this.amountOfLandmines --;
    data = {
      x: tank.x,
      y: tank.y,
      name: tank.name
    }
    socket.emit("landmine", data);
  }

  this.dropTripod = function () {
    this.tripodAmount --;
    data = {
      x: tank.x,
      y: tank.y,
      owner: tank.name
    }
    socket.emit("tripod", data);
  }

  this.dropBlueBomb = function () {
    data = {
      x: tank.x,
      y: tank.y,
      owner: tank.name
    }
    socket.emit("blue-bomb", data);
    this.blueBombAmount--;
  }

  this.dropPulse = function () {
    data = {
      x: tank.x,
      y: tank.y
    }
    socket.emit("pulse", data);
    this.pulsesAmount --;
  }
}


//bullet object
function Bullet(x, y, d, owner, type) {
  this.x = x;
  this.y = y;
  this.speed = 4;
  this.dir = PI+d;
  this.size = type;

  this.owner = owner;
  this.type = type;

  if (this.type == 1) {this.size = 3;}
  else if (this.type == 3) {this.size = 5;}
  else if (this.type == 10) {this.size = 7;}
  else if (this.type == 20) {this.size = 10;}

  this.show = function () {

    fill(0);
    noStroke();
    ellipse(this.x, this.y, this.size, this.size);
  }

  this.update = function () {
    this.x+=this.speed*sin(this.dir);
    this.y-=this.speed*cos(this.dir);


  }
}

//block object
function Block(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = h;
  this.x2 = x+w;
  this.y2 = y+h;

  this.tankPreviousX = tank.x;
  this.tankPreviousY = tank.y;

  this.show = function () {
    noStroke();
    fill(51);
    rect(this.x, this.y, this.width, this.height);
  }

  this.update = function () {
    //prevent getting stuck in a block
    if(this.tankPreviousX + tank.size/3 >= this.x && this.tankPreviousX - tank.size/3 <= this.x2 && this.tankPreviousY + tank.size/3 >= this.y && this.tankPreviousY - tank.size/3 <= this.y2){
      this.tankPreviousX = random(width);
      this.tankPreviousY = random(height);
    }

    //stop tanks if they are hitting a block
    if(tank.x + tank.size/3 > this.x && tank.x - tank.size/3 < this.x2 && tank.y + tank.size/3 > this.y && tank.y - tank.size/3 < this.y2){
      tank.x = this.tankPreviousX;
      tank.y = this.tankPreviousY;
    }else{
      this.tankPreviousX = tank.x;
      this.tankPreviousY = tank.y;
    }

    //delete bullets if they are inside a block
    for (var i = 0; i < bullets.length; i++) {
      if(bullets[i].x > this.x && bullets[i].x < this.x2 && bullets[i].y > this.y && bullets[i].y < this.y2){
        explosions.push(new Explosion(bullets[i].x, bullets[i].y, bullets[i].size, 15, 0.8, color(255,150,0)));//make Explosion
        bullets.splice(i, 1);
      }
    }
  }
}

//add tripod with a gun that shoots closest tank
function Tripod(x, y, owner) {
  this.x = x;
  this.y = y;
  this.size = 30;
  this.owner = owner;
  this.timer = 1000;
  this.dir = 0;
  this.reload = 0;

  this.show = function () {
    push()
    fill(51);
    translate(this.x, this.y);
    rotate(this.dir);
    imageMode(CENTER);
    image(tank.gun, 0, -this.size/3.8, this.size, this.size);
    rectMode(CENTER);
    rect(0, this.size/3, this.timer/50, 2)
    rectMode(CORNER);
    pop();
  }

  this.ai  = function () {
    this.reload --;

    ct = this.findClosestTank();
    if(ct == null){
      return;
    }
    this.timer --;

    var angleToPlayer = 0;
    var x = ct.x - this.x;
    var y = ct.y - this.y;
    if(y < 0){
      angleToPlayer = -atan(x/y);
    }else {
      angleToPlayer = PI-atan(x/y);
    }

    if(this.dir < angleToPlayer){
      this.dir += 0.028
    }else{
      this.dir -= 0.028
    }
    this.shoot();
  }

  this.findClosestTank = function () {
    //find the closest tank to the player
    var ct = null;
    var d = 200;
    if (otherTanks.length > 0) {
      for (var i = 0; i < otherTanks.length; i++) {
        var newD = dist(otherTanks[i].x, otherTanks[i].y, this.x, this.y);
        if(newD < d && otherTanks[i].name != this.owner){
          d = newD;
          ct = otherTanks[i];
        }
      }
    }
    return ct;
  }

  this.shoot = function () {
    if(this.reload <= 0){
      var bulletInfo = {
        x: this.x+22*sin(PI - this.dir),
        y: this.y+22*cos(PI - this.dir),
        dir: PI+this.dir,
        owner: "tripod",
        type: 1
      }
      socket.emit("shot", bulletInfo); //send new bullet data to server
      this.reload = 15;
    }
  }
}

function Landmine (x, y, n) {
  this.x = x;
  this.y = y;
  this.size = 15;
  this.timer = 200;
  this.col = color(255, 150, 0);
  this.ownerName = n;

  this.show = function () {
    fill(this.col);
    ellipse(this.x, this.y, this.size, this.size);
    this.timer--;
    noFill();
    stroke(242, 125, 0);
    arc(this.x, this.y, this.size, this.size, 0, this.timer/200*TWO_PI)
    noStroke();
  }

  this.explode = function () {
    explosions.push(new Explosion(this.x, this.y, this.size, 60, 6, this.col));
    var d = dist(tank.x, tank.y, this.x, this.y)
    if(d < 200){
      tank.health -= (200-d)/2;
      var flingDir = 0;
      var x = tank.x - this.x;
      var y = tank.y - this.y;
      if(y < 0){
        flingDir = -atan(x/y);
      }else {
        flingDir = PI-atan(x/y);
      }
      tank.x += (200-d)*sin(PI - flingDir);
      tank.y += (200-d)*cos(PI - flingDir);
    }
    tank.checkDeath(this.ownerName);
    landmines.splice(landmines.indexOf(this), 1);

    for (var i = 0; i < landmines.length; i++) {
      var d = dist(landmines[i].x, landmines[i].y, this.x, this.y);
      if (d < 150) {
        landmines[i].explode();
      }
    }
    for (var i = 0; i < blueBombs.length; i++) {
      var d = dist(blueBombs[i].x, blueBombs[i].y, this.x, this.y);
      if (d < 150) {
        blueBombs[i].explode();
      }
    }
  }
}

function BlueBomb(x, y, n) {
  this.x = x;
  this.y = y;
  this.size = 15;
  this.col = color(245, 245, 245); //color(70, 167, 242);
  this.ownerName = n;

  this.use = function () {
    fill(this.col);
    ellipse(this.x, this.y, this.size, this.size)

    if (this.ownerName != tank.name) {
      var d = dist(tank.x, tank.y, this.x, this.y)
      if(d < 25){
        var data = {
          x: this.x,
          y: this.y,
          owner: this.ownerName
        }
        socket.emit("blue-bomb-explode", data);
      }
    }
  }

  this.explode = function () {
    var d = dist(tank.x, tank.y, this.x, this.y);
    if (d<50 && this.ownerName != tank.name) {
      tank.health -= 70-d;
      var flingDir = 0;
      var x = tank.x - this.x;
      var y = tank.y - this.y;
      if(y < 0){
        flingDir = -atan(x/y);
      }else {
        flingDir = PI-atan(x/y);
      }
      tank.x += (100-d)*sin(PI - flingDir);
      tank.y += (100-d)*cos(PI - flingDir);
      tank.checkDeath(this.ownerName);
    }
    explosions.push(new Explosion(this.x, this.y, this.size, 60, 4, color(70, 167, 242)));
    blueBombs.splice(blueBombs.indexOf(this), 1);


    for (var i = 0; i < blueBombs.length; i++) {
      var d = dist(blueBombs[i].x, blueBombs[i].y, this.x, this.y);
      if (d < 150) {
        blueBombs[i].explode();
      }
    }
  }
}

function HealthPacket(x, y) {
  this.x = x;
  this.y = y;
  this.size = 20;
  this.show = function () {
    fill(0, 255, 0);
    noStroke();
    rectMode(CENTER);
    rect(this.x, this.y, this.size, this.size/4);
    rect(this.x, this.y, this.size/4, this.size);
    rectMode(CORNER);
  }
}

function Pulse(x, y) {
  this.x = x;
  this.y = y;
  this.colour = color(0, 255, 150);
  this.use = function () {
    explosions.push(new Explosion(this.x, this.y, 10, 40, 12, this.colour));
    var d = dist(this.x, this.y, tank.x, tank.y);
    if(d<200 && d>2){
      var flingDir = 0;
      var x = tank.x - this.x;
      var y = tank.y - this.y;
      if(y < 0){
        flingDir = -atan(x/y);
      }else {
        flingDir = PI-atan(x/y);
      }
      tank.x += (200-d)*sin(PI - flingDir);
      tank.y += (200-d)*cos(PI - flingDir);
    }
  }
}


//make explosions
function Explosion(x, y, s, time, sInc, colour) {
  this.x = x;
  this.y = y;
  this.timer = time;
  this.size = s;
  this.alpha = 100;
  this.rate = 100/this.timer;
  this.sizeIncrease = sInc
  this.col = colour;

  this.use = function () {
    this.size+=this.sizeIncrease;
    this.timer--;
    this.alpha -= this.rate;
    var useColor = color(red(this.col), green(this.col), blue(this.col), this.alpha);
    fill(useColor);
    ellipse(this.x, this.y, this.size, this.size);
  }
}
