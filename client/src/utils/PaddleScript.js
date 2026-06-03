/**
 * Dynamically loads and initializes the Paddle.js v2 SDK on-demand.
 * Binds Paddle to window and configures it with the client-side token.
 */
export function initializePaddleInstance(token, environment = "sandbox", eventCallback = null) {
  return new Promise((resolve, reject) => {
    const initPaddle = () => {
      if (window.Paddle) {
        try {
          if (environment === "sandbox") {
            window.Paddle.Environment.set("sandbox");
          }
          window.Paddle.Initialize({ token, eventCallback });
          resolve(window.Paddle);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error("Paddle SDK loaded but object window.Paddle is missing."));
      }
    };

    if (window.Paddle) {
      initPaddle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = initPaddle;
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

