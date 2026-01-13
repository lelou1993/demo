'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  speed: number;
}

export default function PlaneGame() {
  const [player, setPlayer] = useState<Player>({ x: 0, y: 0, width: 40, height: 40 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const bulletIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const lastShotRef = useRef(0);
  const playerMoveRef = useRef({ left: false, right: false, up: false, down: false });
  const touchRef = useRef({ x: 0, y: 0, touching: false, autoShoot: false });
  const canvasWidthRef = useRef(400);
  const canvasHeightRef = useRef(600);

  const [canvasWidth, setCanvasWidth] = useState(400);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // 响应式画布尺寸 - 全屏
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasWidth(width);
      setCanvasHeight(height);
      canvasWidthRef.current = width;
      canvasHeightRef.current = height;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 初始化玩家位置
  useEffect(() => {
    setPlayer({
      x: canvasWidth / 2 - 20,
      y: canvasHeight - 100,
      width: 40,
      height: 40
    });
  }, [canvasWidth, canvasHeight]);

  const startGame = useCallback(() => {
    setBullets([]);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setPlayer({
      x: canvasWidth / 2 - 20,
      y: canvasHeight - 100,
      width: 40,
      height: 40
    });
    lastShotRef.current = Date.now();
  }, []);

  const shootBullet = useCallback(() => {
    const now = Date.now();
    if (now - lastShotRef.current < 200) return;
    lastShotRef.current = now;

    setBullets(prev => [
      ...prev,
      {
        id: bulletIdRef.current++,
        x: player.x + player.width / 2 - 2,
        y: player.y
      }
    ]);
  }, [player]);

  const spawnEnemy = useCallback(() => {
    const id = enemyIdRef.current++;
    const x = Math.random() * (canvasWidthRef.current - 30);
    const speed = 1 + Math.random() * 1.5;
    setEnemies(prev => [...prev, { id, x, y: -30, speed }]);
  }, []);

  // 键盘和触摸事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          playerMoveRef.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          playerMoveRef.current.right = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          playerMoveRef.current.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          playerMoveRef.current.down = true;
          break;
        case ' ':
          shootBullet();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          playerMoveRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          playerMoveRef.current.right = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          playerMoveRef.current.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          playerMoveRef.current.down = false;
          break;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isPlaying) return;
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      touchRef.current = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        touching: true,
        autoShoot: true
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPlaying) return;
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      touchRef.current.x = (touch.clientX - rect.left) * scaleX;
      touchRef.current.y = (touch.clientY - rect.top) * scaleY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      touchRef.current.touching = false;
      touchRef.current.autoShoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isPlaying, shootBullet]);

  // 游戏主循环
  useEffect(() => {
    if (!isPlaying || gameOver) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = 0;
    let enemySpawnTimer = 0;

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      enemySpawnTimer += deltaTime;

      // 移动玩家
      const speed = 5;

      // 触摸控制
      if (touchRef.current.touching) {
        const targetX = touchRef.current.x - player.width / 2;
        const targetY = touchRef.current.y - player.height / 2;

        setPlayer(prev => {
          let newX = prev.x + (targetX - prev.x) * 0.15;
          let newY = prev.y + (targetY - prev.y) * 0.15;

          newX = Math.max(0, Math.min(canvasWidth - prev.width, newX));
          newY = Math.max(0, Math.min(canvasHeight - prev.height, newY));

          return { ...prev, x: newX, y: newY };
        });

        // 自动射击
        if (touchRef.current.autoShoot) {
          shootBullet();
        }
      } else {
        // 键盘控制
        setPlayer(prev => {
          let newX = prev.x;
          let newY = prev.y;

          if (playerMoveRef.current.left) newX -= speed;
          if (playerMoveRef.current.right) newX += speed;
          if (playerMoveRef.current.up) newY -= speed;
          if (playerMoveRef.current.down) newY += speed;

          // 边界检测
          newX = Math.max(0, Math.min(canvasWidth - prev.width, newX));
          newY = Math.max(0, Math.min(canvasHeight - prev.height, newY));

          return { ...prev, x: newX, y: newY };
        });
      }

      // 生成敌人
      if (enemySpawnTimer > 8000) {
        spawnEnemy();
        enemySpawnTimer = 0;
      }

      // 移动子弹
      setBullets(prev => prev.filter(b => b.y > -10).map(b => ({ ...b, y: b.y - 8 })));

      // 移动敌人
      setEnemies(prev => prev.filter(e => e.y < canvasHeight + 30).map(e => ({ ...e, y: e.y + e.speed })));

      // 碰撞检测
      setBullets(prevBullets => {
        const bulletIdsToRemove: number[] = [];
        const enemyIdsToRemove: number[] = [];
        let newScore = score;

        prevBullets.forEach(bullet => {
          enemies.forEach(enemy => {
            if (
              bullet.x >= enemy.x &&
              bullet.x <= enemy.x + 30 &&
              bullet.y >= enemy.y &&
              bullet.y <= enemy.y + 30
            ) {
              if (!bulletIdsToRemove.includes(bullet.id)) bulletIdsToRemove.push(bullet.id);
              if (!enemyIdsToRemove.includes(enemy.id)) {
                enemyIdsToRemove.push(enemy.id);
                newScore += 10;
              }
            }
          });
        });

        if (bulletIdsToRemove.length > 0) {
          setScore(newScore);
        }

        if (enemyIdsToRemove.length > 0) {
          setEnemies(prev => prev.filter(e => !enemyIdsToRemove.includes(e.id)));
        }

        return prevBullets.filter(b => !bulletIdsToRemove.includes(b.id));
      });

      // 检测玩家是否被敌人撞到
      setPlayer(prev => {
        for (const enemy of enemies) {
          if (
            prev.x < enemy.x + 30 &&
            prev.x + prev.width > enemy.x &&
            prev.y < enemy.y + 30 &&
            prev.y + prev.height > enemy.y
          ) {
            setGameOver(true);
            setIsPlaying(false);
            break;
          }
        }
        return prev;
      });

      // 绘制
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 清空画布
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // 绘制玩家飞机
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.moveTo(player.x + player.width / 2, player.y);
          ctx.lineTo(player.x, player.y + player.height);
          ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
          ctx.lineTo(player.x + player.width, player.y + player.height);
          ctx.closePath();
          ctx.fill();

          // 绘制子弹
          ctx.fillStyle = '#facc15';
          bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, 4, 12);
          });

          // 绘制敌人
          ctx.fillStyle = '#ef4444';
          enemies.forEach(enemy => {
            ctx.fillRect(enemy.x, enemy.y, 30, 30);
          });
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameOver, enemies, score, spawnEnemy]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-2xl font-bold text-black dark:text-zinc-50 bg-white/80 dark:bg-black/80 px-4 py-2 rounded-lg backdrop-blur">
        得分: {score}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full touch-none"
      />
      {!isPlaying && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10">
          <button
            onClick={startGame}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xl transition-colors shadow-lg"
          >
            {gameOver ? '重新开始' : '开始游戏'}
          </button>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center px-4">
            电脑端：方向键或 WASD 移动，空格键发射子弹<br />
            移动端：触摸屏幕拖动飞机，自动发射子弹
          </div>
        </div>
      )}
    </div>
  );
}
