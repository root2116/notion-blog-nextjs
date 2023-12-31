import styles from '../pages/post.module.css'; 

const TableOfContents = ({ headers }) => {
    return (
        <nav>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {headers.map(header => {
                    const headerClass = header.type.replace('_', ''); // 'heading_1' -> 'heading-1'
                    return (
                        <li key={header.id} className={styles[headerClass]}>
                            <a href={`#${header.id}`}>{header.text}</a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default TableOfContents;
