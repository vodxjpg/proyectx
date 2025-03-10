// /app/check-email/page.tsx
import DecryptedText from '@/components/effects/DecryptedText'
import MetaBalls from '@/components/effects/MetaBalls'
export default function CheckEmailPage() {
  return (
    <div className="flex flex-col">
      <main className="mx-auto flex max-w-6xl flex-1 flex-col items-center px-10 py-20 md:py-32">
        <div className="text-center max-w-2xl w-full">
          <div className="mb-8 h-96 py-5 z-40 relative">
            <MetaBalls

              color="#000"
            
              cursorBallColor="#000"
            
              cursorBallSize={4}
            
              ballCount={2}
            
              animationSize={14}
            
              enableMouseInteraction={false}
            
              hoverSmoothness={0.10}
            
              clumpFactor={0.6}
            
              speed={0.3}
        
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 z-30 relativ">
            <DecryptedText

                text="Check your email"
                
                speed={150}
                
                animateOn="view"
                
                maxIterations={20}
                
                characters="ABCD1234!?"
                
                className="revealed"
                
                parentClassName="all-letters"
                
                encryptedClassName="encrypted"
            
            />
          </h1>
          <p>
          We’ve sent a magic link to your email. Please click it to log in and accept your invitation.
          </p>
        </div>
      </main>
    </div>
  )
}