import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const LastOneWinsRace = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(Matter.Engine.create());
  const runnerRef = useRef(Matter.Runner.create());

  const [winner, setWinner] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [timer, setTimer] = useState(20); // 🔥 20 sec

  const lastMovementRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);

  const countries = [
    'in','pk','bd','lk','np','id','th','vn','ph','my',
    'sg','kh','mm','la','bn','kr','jp','cn','hk','tw',
    'us','br','gb','de','fr','au','ca','mx','ng','za'
  ];

  const countryNames = {
    'in':'🇮🇳 INDIA','pk':'🇵🇰 PAKISTAN','bd':'🇧🇩 BANGLADESH','lk':'🇱🇰 SRI LANKA','np':'🇳🇵 NEPAL',
    'id':'🇮🇩 INDONESIA','th':'🇹🇭 THAILAND','vn':'🇻🇳 VIETNAM','ph':'🇵🇭 PHILIPPINES','my':'🇲🇾 MALAYSIA',
    'sg':'🇸🇬 SINGAPORE','kh':'🇰🇭 CAMBODIA','mm':'🇲🇲 MYANMAR','la':'🇱🇦 LAOS','bn':'🇧🇳 BRUNEI',
    'kr':'🇰🇷 KOREA','jp':'🇯🇵 JAPAN','cn':'🇨🇳 CHINA','hk':'🇭🇰 HONG KONG','tw':'🇹🇼 TAIWAN',
    'us':'🇺🇸 USA','br':'🇧🇷 BRAZIL','gb':'🇬🇧 UK','de':'🇩🇪 GERMANY','fr':'🇫🇷 FRANCE',
    'au':'🇦🇺 AUSTRALIA','ca':'🇨🇦 CANADA','mx':'🇲🇽 MEXICO','ng':'🇳🇬 NIGERIA','za':'🇿🇦 SA'
  };

  const flagImages = useRef({});
  useEffect(() => {
    countries.forEach(code => {
      const img = new Image();
      img.src = `https://flagcdn.com/w80/${code}.png`;
      flagImages.current[code] = img;
    });
  }, []);

  const setupWorld = () => {
    const { world } = engineRef.current;
    Matter.World.clear(world);

    setWinner(null);
    setRemaining(countries.length);
    lastMovementRef.current = Date.now();
    setTimer(20);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    engineRef.current.gravity.y = 1.2; // ⚡ faster gravity
    engineRef.current.timing.timeScale = 1.3; // ⚡ overall speed boost

    const wallOptions = { 
      isStatic: true, 
      render: { fillStyle: '#333' }, 
      restitution: 0.9 
    };

    const obs = [];

    // Walls
    obs.push(Matter.Bodies.rectangle(5, 300, 10, 600, wallOptions));
    obs.push(Matter.Bodies.rectangle(595, 300, 10, 600, wallOptions));

    // Zig-zag track
    obs.push(Matter.Bodies.rectangle(150, 120, 300, 15, { ...wallOptions, angle: 0.2 }));
    obs.push(Matter.Bodies.rectangle(450, 240, 300, 15, { ...wallOptions, angle: -0.2 }));
    obs.push(Matter.Bodies.rectangle(150, 360, 300, 15, { ...wallOptions, angle: 0.2 }));
    obs.push(Matter.Bodies.rectangle(450, 480, 300, 15, { ...wallOptions, angle: -0.2 }));

    // Bottom funnels
    obs.push(Matter.Bodies.rectangle(80, 540, 160, 15, { ...wallOptions, angle: 0.3 }));
    obs.push(Matter.Bodies.rectangle(520, 540, 160, 15, { ...wallOptions, angle: -0.3 }));

    // Pit
    const pit = Matter.Bodies.rectangle(300, 600, 250, 30, {
      isStatic: true,
      isSensor: true,
      label: 'PIT'
    });

    // Balls
    countries.forEach((code, i) => {
      const ball = Matter.Bodies.circle(
        50 + Math.random() * 500,
        -50 - (i * 35),
        13,
        {
          restitution: 0.9,
          friction: 0.01,
          frictionAir: 0.001,
          label: 'COUNTRY',
          customName: countryNames[code],
          countryCode: code,
          render: { visible: false }
        }
      );
      Matter.World.add(world, ball);
    });

    Matter.World.add(world, [...obs, pit]);
  };

  useEffect(() => {
    const engine = engineRef.current;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: 600,
        height: 600,
        wireframes: false,
        background: '#050505'
      }
    });

    // ⏱️ TIMER (20 sec)
    const startTimer = () => {
      let timeLeft = 20;
      setTimer(timeLeft);

      timerIntervalRef.current = setInterval(() => {
        timeLeft--;
        setTimer(timeLeft);

        if (timeLeft === 0) {
          clearInterval(timerIntervalRef.current);

          const bodies = engine.world.bodies.filter(b => b.label === 'COUNTRY');

          bodies.forEach(body => {
            Matter.Body.setVelocity(body, { 
              x: body.velocity.x * 0.8, 
              y: -20 // 🚀 strong jump
            });
          });

          setTimeout(startTimer, 2000);
        }
      }, 1000);
    };

    // Stuck fix
    const stuckCheck = setInterval(() => {
      const now = Date.now();
      const bodies = engine.world.bodies.filter(b => b.label === 'COUNTRY');

      const moving = bodies.some(b =>
        Math.abs(b.velocity.x) > 0.1 || Math.abs(b.velocity.y) > 0.1
      );

      if (moving) lastMovementRef.current = now;

      if (now - lastMovementRef.current > 8000 && !winner) {
        setupWorld();
      }
    }, 1000);

    // Draw flags
    Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context;

      engine.world.bodies.forEach(body => {
        if (body.label === 'COUNTRY') {
          const img = flagImages.current[body.countryCode];
          if (img && img.complete) {
            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -18, -14, 36, 28);
            ctx.restore();
          }
        }
      });
    });

    // Collision
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        if (pair.bodyA.label === 'PIT' || pair.bodyB.label === 'PIT') {
          const ball = pair.bodyA.label === 'COUNTRY' ? pair.bodyA : pair.bodyB;

          if (ball.label === 'COUNTRY') {
            Matter.World.remove(engine.world, ball);

            const remainingBalls = engine.world.bodies.filter(b => b.label === 'COUNTRY');
            setRemaining(remainingBalls.length);

            if (remainingBalls.length === 1) {
              setWinner(remainingBalls[0].customName);
              clearInterval(timerIntervalRef.current);

              setTimeout(setupWorld, 6000);
            }
          }
        }
      });
    });

    Matter.Runner.run(runnerRef.current, engine);
    Matter.Render.run(render);

    setupWorld();
    startTimer();

    return () => {
      clearInterval(stuckCheck);
      clearInterval(timerIntervalRef.current);
      Matter.Render.stop(render);
      Matter.Runner.stop(runnerRef.current);
      Matter.World.clear(engine.world);
      render.canvas.remove();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', color: '#fff' }}>
      <h2>💀 LAST ONE WINS 💀</h2>

      <p>🚩 Left: {remaining} | ⏱️ {timer}s</p>

      {winner && <h1>🏆 {winner}</h1>}

      <div ref={sceneRef} />
    </div>
  );
};

export default LastOneWinsRace;