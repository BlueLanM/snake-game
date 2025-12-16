/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable indent */

const config = {
	backgroundColor: "#0a0e27", // 深蓝色背景，更柔和
	height: 600,
	physics: {
		arcade: {
			debug: false,
			gravity: { x: 0 } // 重力
		},
		default: "arcade"
	},
	scene: {
		create,
		update
	},
	type: Phaser.AUTO,
	width: 600
};

const game = new Phaser.Game(config);

let snake; // 蛇的身体数组,每个元素是 {x, y} 坐标
let snakeGraphics; // 用于绘制蛇的图形对象
const gridSize = 10; // 每个格子的大小(像素)
const gridWidth = 60; // 网格宽度(格子数) = 600 / 10
const gridHeight = 60; // 网格高度(格子数) = 600 / 10

// 食物相关变量
let food; // 食物的坐标 {x, y}
let foodGraphics; // 用于绘制食物的图形对象
let score = 0; // 分数
let scoreText; // 分数显示文本
let highScore = 0; // 最高分
let highScoreText; // 最高分显示文本

// 移动相关变量
const direction = { x: 1, y: 0 }; // 当前移动方向 (1,0)表示向右
const directionQueue = []; // 方向队列,存储玩家的连续按键
let moveTimer = 0; // 移动计时器
let moveInterval = 150; // 移动间隔(毫秒),数值越小蛇移动越快
const initialSpeed = 150; // 初始速度
const speedIncrease = 5; // 每吃一个食物速度提升(减少的毫秒数)
const maxSpeed = 50; // 最快速度限制
const maxQueueSize = 3; // 队列最大长度,防止按键堆积太多

// 加速相关变量
let isBoosting = false; // 是否正在加速
const boostMultiplier = 0.5; // 加速倍数（0.5表示速度提升2倍）
let currentMoveInterval = 150; // 当前实际移动间隔

// 键盘控制
let cursors; // 方向键对象

// 游戏状态
let gameOver = false; // 游戏是否结束
let gameOverText; // 游戏结束文本

// 视觉效果相关
let backgroundGrid; // 背景网格
let particles; // 粒子效果管理器
let foodParticles; // 食物粒子效果

// 敌人相关变量
let enemies = []; // 敌人数组
let enemiesGraphics; // 用于绘制敌人的图形对象
let enemySpawnTimer = 0; // 敌人生成计时器
const enemySpawnInterval = 3000; // 敌人生成间隔(毫秒)
const maxEnemies = 5; // 最大敌人数量

// 子弹相关变量
let bullets = []; // 子弹数组
let bulletsGraphics; // 用于绘制子弹的图形对象
const bulletSpeed = 0.5; // 子弹移动速度(每帧移动的格子数)
let ammoText; // 弹药显示文本

// 创建场景
function create() {
	// 0. 从 localStorage 加载最高分
	loadHighScore();

	// 0.5 创建背景网格
	backgroundGrid = this.add.graphics();
	drawBackgroundGrid();

	// 1. 初始化蛇的位置(在屏幕中央,初始长度为3)
	snake = [
		{ x: 30, y: 30 }, // 蛇头
		{ x: 29, y: 30 }, // 身体
		{ x: 28, y: 30 }, // 尾巴
		{ x: 27, y: 30 } // 尾巴
	];

	// 2. 绘制蛇
	snakeGraphics = this.add.graphics();

	// 3. 绘制网格线(可选,方便调试)
	// drawGrid(this);

	// 4. 渲染蛇
	drawSnake();

	// 5. 创建食物图形对象
	foodGraphics = this.add.graphics();

	// 6. 生成第一个食物
	generateFood();

	// 7. 绘制食物
	drawFood();

	// 7.5 创建敌人和子弹图形对象
	enemiesGraphics = this.add.graphics();
	bulletsGraphics = this.add.graphics();

	// 8. 显示分数（增强样式）
	scoreText = this.add.text(15, 15, "分数: 0", {
		fill: "#00ff88",
		fontFamily: "Arial, sans-serif",
		fontSize: "28px",
		fontStyle: "bold",
		shadow: {
			blur: 4,
			color: "#000000",
			fill: true,
			offsetX: 2,
			offsetY: 2,
			stroke: true
		},
		stroke: "#003322",
		strokeThickness: 4
	});

	// 8.5 显示弹药（增强样式）
	ammoText = this.add.text(15, 50, "🔫 弹药: 1", {
		fill: "#ffaa00",
		fontFamily: "Arial, sans-serif",
		fontSize: "24px",
		fontStyle: "bold",
		shadow: {
			blur: 4,
			color: "#000000",
			fill: true,
			offsetX: 2,
			offsetY: 2,
			stroke: true
		},
		stroke: "#663300",
		strokeThickness: 3
	});

	// 9. 创建最高分文本(初始隐藏，增强样式)
	highScoreText = this.add.text(300, 280, "", {
		align: "center",
		fill: "#ffd700",
		fontFamily: "Arial, sans-serif",
		fontSize: "24px",
		fontStyle: "bold",
		shadow: {
			blur: 6,
			color: "#000000",
			fill: true,
			offsetX: 2,
			offsetY: 2,
			stroke: true
		},
		stroke: "#664400",
		strokeThickness: 3
	});
	highScoreText.setOrigin(0.5); // 设置文本中心对齐
	highScoreText.setVisible(false); // 初始隐藏

	// 10. 创建游戏结束文本(初始隐藏，增强样式)
	gameOverText = this.add.text(300, 240, "💀 Game Over! 💀", {
		align: "center",
		fill: "#ff3366",
		fontFamily: "Arial, sans-serif",
		fontSize: "48px",
		fontStyle: "bold",
		shadow: {
			blur: 8,
			color: "#000000",
			fill: true,
			offsetX: 3,
			offsetY: 3,
			stroke: true
		},
		stroke: "#660022",
		strokeThickness: 6
	});
	gameOverText.setOrigin(0.5); // 设置文本中心对齐
	gameOverText.setVisible(false); // 初始隐藏

	// 11. 创建重启提示文本(初始隐藏，增强样式)
	const restartText = this.add.text(300, 360, "⌨️ 按下空格重新开始", {
		align: "center",
		fill: "#88ddff",
		fontFamily: "Arial, sans-serif",
		fontSize: "20px",
		fontStyle: "bold",
		stroke: "#004466",
		strokeThickness: 3
	});
	restartText.setOrigin(0.5);
	restartText.setVisible(false);
	// 将重启文本保存为全局变量
	window.restartText = restartText;

	// 12. 设置键盘控制
	cursors = this.input.keyboard.createCursorKeys();

	// 也可以使用 WASD 键
	this.input.keyboard.on("keydown", handleKeyPress);

	// 12.5 监听射击键（J键或X键）
	this.input.keyboard.on("keydown-J", shootBullet);
	this.input.keyboard.on("keydown-X", shootBullet);

	// 13. 监听空格键用于重启游戏
	this.input.keyboard.on("keydown-SPACE", restartGame);
}

// 生成食物
function generateFood() {
	// 随机生成食物位置,确保不在蛇身上
	let validPosition = false;

	while (!validPosition) {
		food = {
			x: Math.floor(Math.random() * gridWidth),
			y: Math.floor(Math.random() * gridHeight)
		};

		// 检查食物是否在蛇身上
		validPosition = true;
		for (const segment of snake) {
			if (segment.x === food.x && segment.y === food.y) {
				validPosition = false;
				break;
			}
		}
	}
}

// 绘制食物（增强视觉效果）
function drawFood() {
	// 清空之前的绘制
	foodGraphics.clear();

	const x = food.x * gridSize;
	const y = food.y * gridSize;
	const centerX = x + gridSize / 2;
	const centerY = y + gridSize / 2;

	// 外层光晕（脉冲效果）- 淡蓝色
	const pulseSize = Math.sin(Date.now() / 200) * 2 + 6;
	foodGraphics.fillStyle(0x88ccff, 0.3);
	foodGraphics.fillCircle(centerX, centerY, pulseSize);

	// 主体 - 圆形食物（淡蓝色）
	foodGraphics.fillStyle(0x66aaff);
	foodGraphics.fillCircle(centerX, centerY, gridSize * 0.35);

	// 高光（浅蓝色）
	foodGraphics.fillStyle(0xaaddff, 0.8);
	foodGraphics.fillCircle(centerX - 1, centerY - 1, gridSize * 0.15);

	// 装饰点（白色）
	foodGraphics.fillStyle(0xffffff, 0.7);
	foodGraphics.fillCircle(centerX, centerY, gridSize * 0.1);
}

// 获取当前弹药数
function getAmmo() {
	// 弹药 = 身体长度 - 3
	return Math.max(0, snake.length - 3);
}

// 更新弹药显示
function updateAmmoText() {
	const ammo = getAmmo();
	ammoText.setText("🔫 弹药: " + ammo);
}

// 射击子弹
function shootBullet() {
	if (gameOver) return;

	const ammo = getAmmo();
	if (ammo <= 0) {
		// 弹药不足，不能射击
		return;
	}

	// 消耗一格身体（减少弹药）
	if (snake.length > 3) {
		snake.pop(); // 移除蛇尾
		drawSnake(); // 重新绘制蛇
	}

	// 创建子弹
	const head = snake[0];
	const bullet = {
		distance: 0,
		dx: direction.x,

		// 子弹方向与蛇头方向一致
		dy: direction.y,

		x: head.x + 0.5,

		// 从蛇头中心发射
		y: head.y + 0.5 // 已飞行距离
	};

	bullets.push(bullet);
	updateAmmoText();

	// 播放射击音效（视觉反馈）
	createShootEffect(head.x * gridSize + gridSize / 2, head.y * gridSize + gridSize / 2);
}

// 创建射击特效
function createShootEffect(x, y) {
	if (!snakeGraphics || !snakeGraphics.scene) return;

	const scene = snakeGraphics.scene;
	const flash = scene.add.graphics();
	flash.fillStyle(0xffff00, 0.8);
	flash.fillCircle(x, y, 8);

	scene.tweens.add({
		alpha: 0,
		duration: 200,
		ease: "Power2",
		onComplete: () => {
			flash.destroy();
		},
		targets: flash
	});
}

// 处理键盘按键
function handleKeyPress(event) {
	switch (event.keyCode) {
		case Phaser.Input.Keyboard.KeyCodes.UP:
		case Phaser.Input.Keyboard.KeyCodes.W:
			changeDirection(0, -1); // 向上
			break;
		case Phaser.Input.Keyboard.KeyCodes.DOWN:
		case Phaser.Input.Keyboard.KeyCodes.S:
			changeDirection(0, 1); // 向下
			break;
		case Phaser.Input.Keyboard.KeyCodes.LEFT:
		case Phaser.Input.Keyboard.KeyCodes.A:
			changeDirection(-1, 0); // 向左
			break;
		case Phaser.Input.Keyboard.KeyCodes.RIGHT:
		case Phaser.Input.Keyboard.KeyCodes.D:
			changeDirection(1, 0); // 向右
			break;
	}
}

// 改变移动方向
function changeDirection(x, y) {
	// 获取参考方向 (如果队列为空,用当前方向;否则用队列最后一个)
	const lastDirection = directionQueue.length === 0
		? direction
		: directionQueue[directionQueue.length - 1];

	// 防止反向移动 (例如:向右移动时不能直接向左)
	if (lastDirection.x + x === 0 && lastDirection.y + y === 0) {
		return; // 如果是反方向,忽略这次按键
	}

	// 检查是否按下的是同方向键（加速）
	if (lastDirection.x === x && lastDirection.y === y) {
		// 同方向按键 - 不添加到队列，加速逻辑由按键状态处理
		return;
	}

	// 如果队列已满,忽略新的按键
	if (directionQueue.length >= maxQueueSize) {
		return;
	}

	// 将新方向加入队列
	directionQueue.push({ x, y });
}

// 检查是否按住当前方向键（加速检测）
function checkBoostInput(cursors) {
	// 检查当前方向是否有对应的按键被按住
	if (direction.x === 1 && (cursors.right.isDown || isKeyDown("D"))) {
		// 向右移动且按住右键或D键
		return true;
	} else if (direction.x === -1 && (cursors.left.isDown || isKeyDown("A"))) {
		// 向左移动且按住左键或A键
		return true;
	} else if (direction.y === -1 && (cursors.up.isDown || isKeyDown("W"))) {
		// 向上移动且按住上键或W键
		return true;
	} else if (direction.y === 1 && (cursors.down.isDown || isKeyDown("S"))) {
		// 向下移动且按住下键或S键
		return true;
	}
	return false;
}

// 检查指定键是否被按下
function isKeyDown(key) {
	if (!cursors || !cursors.up || !cursors.up.scene) return false;
	const keyboard = cursors.up.scene.input.keyboard;
	const keyObj = keyboard.addKey(key);
	return keyObj.isDown;
}

// 绘制网格
function drawGrid(scene) {
	const gridGraphics = scene.add.graphics();
	gridGraphics.lineStyle(1, 0xffffff, 0.3);

	// 绘制垂直线
	for (let i = 0; i <= gridWidth; i++) {
		gridGraphics.lineBetween(
			i * gridSize,
			0,
			i * gridSize,
			gridHeight * gridSize
		);
	}

	// 绘制水平线
	for (let i = 0; i <= gridHeight; i++) {
		gridGraphics.lineBetween(
			0,
			i * gridSize,
			gridWidth * gridSize,
			i * gridSize
		);
	}
}

// 绘制背景网格
function drawBackgroundGrid() {
	backgroundGrid.clear();
	backgroundGrid.lineStyle(1, 0x1a2332, 0.4); // 深色半透明网格线

	// 绘制垂直线
	for (let i = 0; i <= gridWidth; i++) {
		backgroundGrid.lineBetween(
			i * gridSize,
			0,
			i * gridSize,
			gridHeight * gridSize
		);
	}

	// 绘制水平线
	for (let i = 0; i <= gridHeight; i++) {
		backgroundGrid.lineBetween(
			0,
			i * gridSize,
			gridWidth * gridSize,
			i * gridSize
		);
	}
}

// 绘制蛇（增强视觉效果）
function drawSnake() {
	// 清空之前的绘制
	snakeGraphics.clear();

	// 遍历蛇身,绘制每一节
	snake.forEach((segment, index) => {
		const x = segment.x * gridSize;
		const y = segment.y * gridSize;

		if (index === 0) {
			// 蛇头 - 使用渐变效果和圆角
			snakeGraphics.fillStyle(0x00ff88); // 亮青绿色
			snakeGraphics.fillRoundedRect(x + 1, y + 1, gridSize - 2, gridSize - 2, 3);

			// 添加蛇头高光
			snakeGraphics.fillStyle(0x88ffcc, 0.6);
			snakeGraphics.fillCircle(x + gridSize * 0.4, y + gridSize * 0.4, gridSize * 0.2);

			// 绘制眼睛
			snakeGraphics.fillStyle(0xffffff);
			if (direction.x === 1) { // 向右
				snakeGraphics.fillCircle(x + gridSize * 0.7, y + gridSize * 0.3, 1.5);
				snakeGraphics.fillCircle(x + gridSize * 0.7, y + gridSize * 0.7, 1.5);
			} else if (direction.x === -1) { // 向左
				snakeGraphics.fillCircle(x + gridSize * 0.3, y + gridSize * 0.3, 1.5);
				snakeGraphics.fillCircle(x + gridSize * 0.3, y + gridSize * 0.7, 1.5);
			} else if (direction.y === -1) { // 向上
				snakeGraphics.fillCircle(x + gridSize * 0.3, y + gridSize * 0.3, 1.5);
				snakeGraphics.fillCircle(x + gridSize * 0.7, y + gridSize * 0.3, 1.5);
			} else { // 向下
				snakeGraphics.fillCircle(x + gridSize * 0.3, y + gridSize * 0.7, 1.5);
				snakeGraphics.fillCircle(x + gridSize * 0.7, y + gridSize * 0.7, 1.5);
			}
		} else {
			// 身体 - 使用渐变深度
			const opacity = 1 - (index / snake.length) * 0.3; // 越靠近尾巴越透明
			const greenValue = Math.max(0x44, 0x88 - index * 2); // 渐变绿色值
			const color = (greenValue << 8) | 0x00ff00;

			snakeGraphics.fillStyle(color, opacity);
			snakeGraphics.fillRoundedRect(x + 1.5, y + 1.5, gridSize - 3, gridSize - 3, 2);
		}
	});

	// 如果正在加速，给蛇头添加光晕效果
	if (isBoosting) {
		const head = snake[0];
		snakeGraphics.lineStyle(2, 0x00ffff, 0.6);
		snakeGraphics.strokeRoundedRect(
			head.x * gridSize,
			head.y * gridSize,
			gridSize,
			gridSize,
			4
		);
	}
}

// 生成敌人
function spawnEnemy() {
	if (enemies.length >= maxEnemies) return;

	// 随机生成敌人位置，确保不在蛇身上、食物上
	let validPosition = false;
	let enemy;

	while (!validPosition) {
		enemy = {
			// 随机移动速度
			direction: {
				x: Math.random() > 0.5 ? 1 : -1,
				y: Math.random() > 0.5 ? 1 : -1
			},

			moveInterval: 800 + Math.random() * 400,

			moveTimer: 0,

			x: Math.floor(Math.random() * gridWidth),
			y: Math.floor(Math.random() * gridHeight)
		};

		// 检查是否与蛇、食物重叠
		validPosition = true;
		for (const segment of snake) {
			if (segment.x === enemy.x && segment.y === enemy.y) {
				validPosition = false;
				break;
			}
		}
		if (food.x === enemy.x && food.y === enemy.y) {
			validPosition = false;
		}
		// 确保敌人不在蛇头附近5格内
		const head = snake[0];
		const dist = Math.abs(head.x - enemy.x) + Math.abs(head.y - enemy.y);
		if (dist < 5) {
			validPosition = false;
		}
	}

	enemies.push(enemy);
}

// 绘制敌人
function drawEnemies() {
	enemiesGraphics.clear();

	enemies.forEach(enemy => {
		const x = enemy.x * gridSize;
		const y = enemy.y * gridSize;

		// 绘制敌人主体（红色骷髅样式）
		enemiesGraphics.fillStyle(0xff0066);
		enemiesGraphics.fillRoundedRect(x + 1, y + 1, gridSize - 2, gridSize - 2, 2);

		// 绘制敌人眼睛（恐怖效果）
		enemiesGraphics.fillStyle(0xffff00);
		enemiesGraphics.fillCircle(x + gridSize * 0.35, y + gridSize * 0.35, 1.5);
		enemiesGraphics.fillCircle(x + gridSize * 0.65, y + gridSize * 0.35, 1.5);

		// 绘制危险标记
		enemiesGraphics.lineStyle(1, 0xff0000, 0.5);
		enemiesGraphics.strokeRect(x, y, gridSize, gridSize);
	});
}

// 更新敌人
function updateEnemies(delta) {
	enemies.forEach(enemy => {
		enemy.moveTimer += delta;

		// 敌人随机移动
		if (enemy.moveTimer >= enemy.moveInterval) {
			enemy.moveTimer = 0;

			// 随机改变方向
			if (Math.random() < 0.3) {
				enemy.direction.x = Math.random() > 0.5 ? 1 : -1;
				enemy.direction.y = Math.random() > 0.5 ? 1 : -1;
			}

			// 移动敌人
			enemy.x += enemy.direction.x;
			enemy.y += enemy.direction.y;

			// 边界检测
			enemy.x = (enemy.x + gridWidth) % gridWidth;
			enemy.y = (enemy.y + gridHeight) % gridHeight;
		}
	});
}

// 绘制子弹
function drawBullets() {
	bulletsGraphics.clear();

	bullets.forEach(bullet => {
		const x = bullet.x * gridSize;
		const y = bullet.y * gridSize;

		// 子弹主体
		bulletsGraphics.fillStyle(0xffff00);
		bulletsGraphics.fillCircle(x, y, 3);

		// 子弹光晕
		bulletsGraphics.fillStyle(0xffff00, 0.3);
		bulletsGraphics.fillCircle(x, y, 5);
	});
}

// 更新子弹
function updateBullets() {
	for (let i = bullets.length - 1; i >= 0; i--) {
		const bullet = bullets[i];

		// 移动子弹
		bullet.x += bullet.dx * bulletSpeed;
		bullet.y += bullet.dy * bulletSpeed;
		bullet.distance += bulletSpeed;

		// 检查子弹是否出界或飞行过远
		if (bullet.x < 0 || bullet.x >= gridWidth
			|| bullet.y < 0 || bullet.y >= gridHeight
			|| bullet.distance > 30) {
			bullets.splice(i, 1);
			continue;
		}

		// 检查子弹是否击中敌人
		const bulletGridX = Math.floor(bullet.x);
		const bulletGridY = Math.floor(bullet.y);

		for (let j = enemies.length - 1; j >= 0; j--) {
			const enemy = enemies[j];
			if (enemy.x === bulletGridX && enemy.y === bulletGridY) {
				// 击杀敌人!
				createEnemyDeathEffect(enemy.x * gridSize + gridSize / 2, enemy.y * gridSize + gridSize / 2);
				enemies.splice(j, 1);
				bullets.splice(i, 1);

				// 奖励：增加两格身体长度
				snake.push({ x: -100, y: -100 }); // 临时位置
				snake.push({ x: -100, y: -100 }); // 临时位置

				// 增加分数
				score += 5;
				scoreText.setText("分数: " + score);
				updateAmmoText();
				break;
			}
		}
	}
}

// 创建敌人死亡特效
function createEnemyDeathEffect(x, y) {
	if (!enemiesGraphics || !enemiesGraphics.scene) return;

	const scene = enemiesGraphics.scene;

	// 创建爆炸粒子
	for (let i = 0; i < 12; i++) {
		const particle = scene.add.graphics();
		particle.fillStyle(0xff0066, 1);
		particle.fillCircle(0, 0, 3);
		particle.setPosition(x, y);

		const angle = (Math.PI * 2 * i) / 12;
		const speed = 80 + Math.random() * 40;
		const vx = Math.cos(angle) * speed;
		const vy = Math.sin(angle) * speed;

		scene.tweens.add({
			alpha: 0,
			duration: 500,
			ease: "Power2",
			onComplete: () => {
				particle.destroy();
			},
			targets: particle,
			x: x + vx,
			y: y + vy
		});
	}
}

// 检查蛇是否碰到敌人
function checkEnemyCollision() {
	const head = snake[0];

	for (const enemy of enemies) {
		if (head.x === enemy.x && head.y === enemy.y) {
			// 碰到敌人，游戏结束!
			endGame();
			return true;
		}
	}
	return false;
}

// 蛇的移动函数
function moveSnake() {
	// 0. 从队列中取出下一个方向 (如果有的话)
	if (directionQueue.length > 0) {
		const nextDir = directionQueue.shift(); // 取出队列第一个元素
		direction.x = nextDir.x;
		direction.y = nextDir.y;
	}

	// 1. 计算新的蛇头位置 (当前蛇头坐标 + 移动方向)
	const head = snake[0];
	const newHead = {
		x: head.x + direction.x,
		y: head.y + direction.y
	};

	// 2. 边界检测 - 穿墙效果
	newHead.x = (newHead.x + gridWidth) % gridWidth;
	newHead.y = (newHead.y + gridHeight) % gridHeight;

	// 3. 自撞检测 - 检查新的蛇头位置是否与身体重叠
	for (let i = 0; i < snake.length; i++) {
		if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
			// 蛇头撞到自己的身体,游戏结束!
			endGame();
			return; // 停止移动
		}
	}

	// 4. 在蛇头位置添加新格子
	snake.unshift(newHead);

	// 4.5 检查是否碰到敌人
	if (checkEnemyCollision()) {
		return; // 游戏结束
	}

	// 5. 检查是否吃到食物
	let ateFood = false;
	if (newHead.x === food.x && newHead.y === food.y) {
		// 吃到食物!
		ateFood = true;
		score++; // 分数增加
		scoreText.setText("分数: " + score); // 更新分数显示

		// 创建吃食物的粒子效果
		createFoodEatEffect(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2);

		// 加速! 每吃一个食物速度变快
		moveInterval = Math.max(maxSpeed, moveInterval - speedIncrease);

		generateFood(); // 生成新食物
		drawFood(); // 绘制新食物
		updateAmmoText(); // 更新弹药显示
	}

	// 6. 如果没吃到食物,删除蛇尾(吃到食物就不删除,蛇就变长了!)
	if (!ateFood) {
		snake.pop();
	}

	// 7. 重新绘制蛇
	drawSnake();
}

// 从 localStorage 加载最高分
function loadHighScore() {
	const saved = localStorage.getItem("snakeHighScore");
	if (saved !== null) {
		highScore = parseInt(saved, 10);
	} else {
		highScore = 0;
	}
}

// 保存最高分到 localStorage
function saveHighScore() {
	localStorage.setItem("snakeHighScore", highScore.toString());
}

// 更新最高分
function updateHighScore() {
	// 先检查是否打破记录
	const isNewRecord = score > highScore;

	if (isNewRecord) {
		highScore = score;
		saveHighScore(); // 保存到 localStorage
	}

	// 显示最高分信息
	if (isNewRecord) {
		highScoreText.setText("🎉 新的最高分: " + highScore + " 🎉");
	} else {
		highScoreText.setText("分数: " + score + "\n\n最高分: " + highScore);
	}
}

// 游戏结束
function endGame() {
	gameOver = true; // 设置游戏结束标志
	updateHighScore(); // 更新最高分

	// 显示游戏结束相关文本
	gameOverText.setVisible(true); // 显示游戏结束文本
	highScoreText.setVisible(true); // 显示最高分
	if (window.restartText) {
		window.restartText.setVisible(true); // 显示重启提示
	}
}

// 重启游戏
function restartGame() {
	// 只有在游戏结束时才能重启
	if (!gameOver) {
		return;
	}

	// 重置游戏状态
	gameOver = false;
	gameOverText.setVisible(false);
	highScoreText.setVisible(false); // 隐藏最高分
	if (window.restartText) {
		window.restartText.setVisible(false); // 隐藏重启提示
	}

	// 重置蛇的位置和长度
	snake = [
		{ x: 10, y: 10 }, // 蛇头
		{ x: 9, y: 10 }, // 身体
		{ x: 8, y: 10 }, // 尾巴
		{ x: 7, y: 10 } // 尾巴
	];

	// 重置方向
	direction.x = 1;
	direction.y = 0;
	directionQueue.length = 0; // 清空方向队列

	// 重置速度
	moveInterval = initialSpeed;
	moveTimer = 0;
	enemySpawnTimer = 0;

	// 重置分数
	score = 0;
	scoreText.setText("分数: 0");

	// 清空敌人和子弹
	enemies = [];
	bullets = [];

	// 生成新食物
	generateFood();
	drawFood();

	// 重新绘制蛇
	drawSnake();
	updateAmmoText();
}

// 创建吃食物的粒子效果
function createFoodEatEffect(x, y) {
	if (!foodGraphics || !foodGraphics.scene) return;

	const scene = foodGraphics.scene;

	// 创建多个小粒子（淡蓝色）
	for (let i = 0; i < 8; i++) {
		const particle = scene.add.graphics();
		particle.fillStyle(0x66aaff, 1);
		particle.fillCircle(0, 0, 2);
		particle.setPosition(x, y);

		// 随机方向
		const angle = (Math.PI * 2 * i) / 8;
		const speed = 50 + Math.random() * 50;
		const vx = Math.cos(angle) * speed;
		const vy = Math.sin(angle) * speed;

		// 使用 tween 创建动画
		scene.tweens.add({
			alpha: 0,
			duration: 400,
			ease: "Power2",
			onComplete: () => {
				particle.destroy();
			},
			targets: particle,
			x: x + vx,
			y: y + vy
		});
	}
}

// 游戏主循环
function update(time, delta) {
	// 如果游戏结束,停止更新
	if (gameOver) {
		return;
	}

	// 检查是否按住当前方向键（加速检测）
	isBoosting = checkBoostInput(cursors);

	// 计算当前实际移动间隔（根据是否加速）
	currentMoveInterval = isBoosting
		? moveInterval * boostMultiplier
		: moveInterval;

	// 累加时间
	moveTimer += delta;

	// 当累积时间达到移动间隔时,移动蛇
	if (moveTimer >= currentMoveInterval) {
		moveSnake();
		moveTimer = 0; // 重置计时器
	}

	// 敌人生成计时器
	enemySpawnTimer += delta;
	if (enemySpawnTimer >= enemySpawnInterval) {
		spawnEnemy();
		enemySpawnTimer = 0;
	}

	// 更新敌人
	updateEnemies(delta);

	// 更新子弹
	updateBullets();

	// 持续重绘
	drawFood();
	drawEnemies();
	drawBullets();
}