/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable indent */
import { preload } from "./load.js";

const config = {
	backgroundColor: "#000000ff",
	height: 200,
	physics: {
		arcade: {
			debug: false,
			gravity: { x: 0 } // 重力
		},
		default: "arcade"
	},
	scene: {
		create,
		preload,
		update
	},
	type: Phaser.AUTO,
	width: 200
};

const game = new Phaser.Game(config);

let snake; // 蛇的身体数组,每个元素是 {x, y} 坐标
let snakeGraphics; // 用于绘制蛇的图形对象
const gridSize = 10; // 每个格子的大小(像素)
const gridWidth = 20; // 网格宽度(格子数) = 600 / 10
const gridHeight = 20; // 网格高度(格子数) = 600 / 10

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

// 键盘控制
let cursors; // 方向键对象

// 游戏状态
let gameOver = false; // 游戏是否结束
let gameOverText; // 游戏结束文本

// 创建场景
function create() {
	// 0. 从 localStorage 加载最高分
	loadHighScore();

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

	// 8. 显示分数
	scoreText = this.add.text(10, 10, "分数: 0", {
		fill: "#ffffff",
		fontSize: "20px"
	});

	// 9. 创建最高分文本(初始隐藏)
	highScoreText = this.add.text(100, 130, "", {
		align: "center",
		fill: "#ffff00",
		fontSize: "14px"
	});
	highScoreText.setOrigin(0.5); // 设置文本中心对齐
	highScoreText.setVisible(false); // 初始隐藏

	// 10. 创建游戏结束文本(初始隐藏)
	gameOverText = this.add.text(100, 90, "Game Over!", {
		align: "center",
		fill: "#ff0000",
		fontSize: "18px"
	});
	gameOverText.setOrigin(0.5); // 设置文本中心对齐
	gameOverText.setVisible(false); // 初始隐藏

	// 11. 创建重启提示文本(初始隐藏)
	const restartText = this.add.text(100, 155, "按下空格重新开始", {
		align: "center",
		fill: "#ffffff",
		fontSize: "12px"
	});
	restartText.setOrigin(0.5);
	restartText.setVisible(false);
	// 将重启文本保存为全局变量
	window.restartText = restartText;

	// 12. 设置键盘控制
	cursors = this.input.keyboard.createCursorKeys();

	// 也可以使用 WASD 键
	this.input.keyboard.on("keydown", handleKeyPress);

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

// 绘制食物
function drawFood() {
	// 清空之前的绘制
	foodGraphics.clear();

	// 绘制红色的食物
	foodGraphics.fillStyle(0xff0000); // 红色
	foodGraphics.fillRect(
		food.x * gridSize + 1,
		food.y * gridSize + 1,
		gridSize - 2,
		gridSize - 2
	);
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
	// 如果队列已满,忽略新的按键
	if (directionQueue.length >= maxQueueSize) {
		return;
	}

	// 获取参考方向 (如果队列为空,用当前方向;否则用队列最后一个)
	const lastDirection = directionQueue.length === 0
		? direction
		: directionQueue[directionQueue.length - 1];

	// 防止反向移动 (例如:向右移动时不能直接向左)
	if (lastDirection.x + x === 0 && lastDirection.y + y === 0) {
		return; // 如果是反方向,忽略这次按键
	}

	// 防止重复添加相同方向
	if (lastDirection.x === x && lastDirection.y === y) {
		return;
	}

	// 将新方向加入队列
	directionQueue.push({ x, y });
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

// 绘制蛇
function drawSnake() {
	// 清空之前的绘制
	snakeGraphics.clear();

	// 遍历蛇身,绘制每一节
	snake.forEach((segment, index) => {
		if (index === 0) {
			// 蛇头 - 使用亮绿色
			snakeGraphics.fillStyle(0x00ff00);
		} else {
			// 身体 - 使用深绿色
			snakeGraphics.fillStyle(0x00aa00);
		}

		// 绘制矩形 (网格坐标 × 格子大小 = 像素坐标)
		// 减去2像素作为间隙,让格子之间有分隔
		snakeGraphics.fillRect(
			segment.x * gridSize + 1,
			segment.y * gridSize + 1,
			gridSize - 2,
			gridSize - 2
		);
	});
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

	// 4. 检查是否吃到食物
	let ateFood = false;
	if (newHead.x === food.x && newHead.y === food.y) {
		// 吃到食物!
		ateFood = true;
		score++; // 分数增加
		scoreText.setText("分数: " + score); // 更新分数显示

		// 加速! 每吃一个食物速度变快
		moveInterval = Math.max(maxSpeed, moveInterval - speedIncrease);

		generateFood(); // 生成新食物
		drawFood(); // 绘制新食物
	}

	// 5. 如果没吃到食物,删除蛇尾(吃到食物就不删除,蛇就变长了!)
	if (!ateFood) {
		snake.pop();
	}

	// 6. 重新绘制蛇
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

	// 重置分数
	score = 0;
	scoreText.setText("分数: 0");

	// 生成新食物
	generateFood();
	drawFood();

	// 重新绘制蛇
	drawSnake();
}

// 游戏主循环
function update(time, delta) {
	// 如果游戏结束,停止更新
	if (gameOver) {
		return;
	}

	// 累加时间
	moveTimer += delta;

	// 当累积时间达到移动间隔时,移动蛇
	if (moveTimer >= moveInterval) {
		moveSnake();
		moveTimer = 0; // 重置计时器
	}
}