export default function StickyHeader({title,onBack}){return <header className="sticky-header"><button onClick={onBack} aria-label="Назад">←</button><strong>{title}</strong></header>}
