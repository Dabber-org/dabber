import { env } from "@/env";

export async function GET() {
  const bubbleUrl = `${env.APP_URL}/bubble`;
  const chatUrl = `${env.APP_URL}`;

  const js = `
    (function () {
      function attachWidget() {
        // Create backdrop for blurred background
        const backdrop = document.createElement(\"div\");
        backdrop.style.cssText = 
          \"position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:999998; opacity:0; visibility:hidden; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer;\";
        document.body.appendChild(backdrop);

        // Create bubble iframe
        const bubbleIframe = document.createElement(\"iframe\");
        bubbleIframe.src = \"${bubbleUrl}\";
        bubbleIframe.style.cssText =
          \"position:fixed; bottom:24px; right:24px; width:160px; height:60px; border:none; border-radius:19px; z-index:999999; background:transparent; transition:all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); transform:scale(1); opacity:1; \";
        document.body.appendChild(bubbleIframe);

        // Create chat iframe (full screen)
        const chatIframe = document.createElement(\"iframe\");
        chatIframe.src = \"${chatUrl}\";
        chatIframe.style.cssText =
          \"position:fixed; top:0; left:0; width:100vw; height:100vh; border:none; z-index:999999; transform:scale(0.9); opacity:0; visibility:hidden; transition:all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); border-radius:0;\";
        document.body.appendChild(chatIframe);

        // Animation states
        let isAnimating = false;
        let chatOpen = false;

        window.addEventListener("message", (e) => {
          if (e.data.type === "open-chat" && !isAnimating && !chatOpen) {
            isAnimating = true;
            chatOpen = true;
            
            // Step 1: Animate bubble out with bounce effect
            bubbleIframe.style.transform = "scale(0.8) rotate(10deg)";
            bubbleIframe.style.opacity = "0";
            
            // Step 2: Show backdrop with blur
            setTimeout(() => {
              backdrop.style.opacity = "1";
              backdrop.style.visibility = "visible";
            }, 100);
            
            // Step 3: Hide bubble and prepare chat
            setTimeout(() => {
              bubbleIframe.style.visibility = "hidden";
              chatIframe.style.visibility = "visible";
              chatIframe.style.transform = "scale(1)";
              chatIframe.style.opacity = "1";
            }, 200);
            
            // Step 4: Complete animation
            setTimeout(() => {
              isAnimating = false;
            }, 600);
          }
          
          if (e.data.type === "close-chat" && !isAnimating && chatOpen) {
            isAnimating = true;
            chatOpen = false;
            
            // Step 1: Animate chat out
            chatIframe.style.transform = "scale(0.9)";
            chatIframe.style.opacity = "0";
            
            // Step 2: Hide backdrop
            setTimeout(() => {
              backdrop.style.opacity = "0";
              backdrop.style.visibility = "hidden";
            }, 100);
            
            // Step 3: Hide chat and prepare bubble
            setTimeout(() => {
              chatIframe.style.visibility = "hidden";
              chatIframe.style.transform = "scale(0.8)";
              bubbleIframe.style.visibility = "visible";
              bubbleIframe.style.transform = "scale(1.1)";
              bubbleIframe.style.opacity = "1";
            }, 200);
            
            // Step 4: Settle bubble animation
            setTimeout(() => {
              bubbleIframe.style.transform = "scale(1) rotate(0deg)";
            }, 300);
            
            // Step 5: Complete animation
            setTimeout(() => {
              isAnimating = false;
            }, 600);
          }
        });
        
        // Add close button functionality when clicking backdrop
        backdrop.addEventListener("click", () => {
          if (chatOpen && !isAnimating) {
            window.postMessage({ type: "close-chat" }, "*");
          }
        });
        
        // Prevent body scroll when chat is open
        const observer = new MutationObserver(() => {
          if (chatOpen) {
            document.body.style.overflow = "hidden";
          } else {
            document.body.style.overflow = "";
          }
        });
        observer.observe(backdrop, { attributes: true, attributeFilter: ['style'] });
      }

      if (document.readyState === "complete" || document.readyState === "interactive") {
        attachWidget();
      } else {
        document.addEventListener("DOMContentLoaded", attachWidget);
      }
    })();
  `;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
