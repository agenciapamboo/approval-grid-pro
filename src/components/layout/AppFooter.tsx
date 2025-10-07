export function AppFooter() {
  return (
    <footer className="mt-auto border-t bg-card/50 w-full">
      <div className="container mx-auto px-4 py-4 text-center w-full">
        <p className="text-sm font-poppins">
          <span className="font-normal">Desenvolvido com </span>
          <span className="text-[#FFD700]">💛</span>
          <span className="font-normal"> por </span>
          <a 
            href="https://agenciapamboo.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold hover:underline transition-colors hover:text-primary"
          >
            Pamboo Criativos
          </a>
        </p>
      </div>
    </footer>
  );
}
