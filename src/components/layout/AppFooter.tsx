export function AppFooter() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center font-poppins text-sm">
          <span className="font-normal">Desenvolvido com </span>
          <span className="text-[#FFD700]">💛</span>
          <span className="font-normal"> por </span>
          <a 
            href="https://agenciapamboo.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold hover:underline"
          >
            Pamboo Criativos
          </a>
        </p>
      </div>
    </footer>
  );
}
