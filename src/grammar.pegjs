{
    function concatList(head, tail, skip) {
        var t;

        t = tail.reduce(function(acc, val) {
            return acc.concat(val[skip]);
        }, []);

        return [head].concat(t);
    }

    function reduceModifiersArray(mods, defaults = {}) {
        return (mods || []).reduce((map, val) => ({...map, ...val}), defaults);
    }
}

start = head:statement tail:(whitespace* statement)* __ { return concatList(head, tail, 1); }

// ---------- top level definitions ----------

statement = 
    use_database
    / drop_statement
    / create_statement
    / alter_statement
    / whitespace* '--' '-'* [^\r\n]* { return {type: 'comment'}; }       // comment line
    / whitespace* block_comment { return {type: 'comment'}; }

use_database = 
    whitespace* KW_USE __ name:ident_name __ EOS { return { type: 'use_database', name }; }

drop_statement =
    whitespace* KW_DROP __ target:drop_target (__ drop_condition)? __ name:ident_name __ EOS { return { type: 'drop_schema_item', target, name};}

create_statement = 
    whitespace* KW_CREATE __ sw:create_kinds __ EOS { return { type: 'create_schema_item', ...sw}; }

alter_statement = 
    whitespace* KW_ALTER __ KW_TABLE __ name:ident_name __ alter_spec_list __ EOS { return { type: 'alter_schema_item', name}; }

// ---------- top level definitions ----------

alter_spec_list = head:alter_spec tail:(__ KW_COMMA __ alter_spec)* { return concatList(head, tail, 3); }

alter_spec = 
    KW_ADD __ KW_FOREIGN_KEY __ KW_LBRACKET __ ref_columns:ident_list __ KW_RBRACKET __ KW_REFERENCES __ ref_table_name:ident_name __ KW_LBRACKET __ 
        ref_keys:ident_list __ KW_RBRACKET ref_actions:reference_action* __

create_kinds = 
    KW_DATABASE if_not_exists? __ name:ident_name __ KW_CHARACTER_SET __ KW_EQ_OPERATOR __ charset:ident_name __ 
        KW_COLLATE __ KW_EQ_OPERATOR __ collate:ident_name {
        return { 'schema_item': 'database', name, charset, collate };
    }
    / KW_TABLE if_not_exists? __ name:ident_name __ KW_LBRACKET __ definitions:create_definitions_list __ KW_RBRACKET options:create_table_options*  {
        return { 'schema_item': 'table', name, definitions, options: reduceModifiersArray(options) };
    }

if_not_exists = __ KW_IF __ KW_NOT __ KW_EXISTS

create_definitions_list = head:create_definition tail:(__ KW_COMMA __ create_definition)* { return concatList(head, tail, 3); }

create_definition = 
    index_definition
    / column_definition

create_table_options = 
    __ KW_ENGINE (__ KW_EQ_OPERATOR)? __ name:ident_name { return { engine: name }; }
    / __ KW_AUTO_INCREMENT (__ KW_EQ_OPERATOR) __ num:number { return { auto_increment: num }; }
    / __ (KW_DEFAULT __ )? KW_CHARSET (__ KW_EQ_OPERATOR) __ charset:ident_name { return { charset }; }
    / __ (KW_DEFAULT __ )? KW_COLLATE (__ KW_EQ_OPERATOR) __ collate:ident_name { return { collate }; }

column_definition =
    name:ident_name __ datatype:data_types mods:column_additional_modifiers* {
        return { 
            'def_type': 'column',
            name, 
            datatype, 
            ...reduceModifiersArray(mods, { auto_incr: false, is_pk: false, nullable: true, def_val: null })
        };
    }

column_additional_modifiers =
    __ auto_incr:KW_AUTO_INCREMENT { return { auto_incr: Boolean(auto_incr)};}
    / __ pk:KW_PRIMARY_KEY { return { is_pk: Boolean(pk)};}
    / __ nullable:column_nullability_spec { return { nullable: (nullable !== undefined && nullable !== null) ? nullable : true }; }
    / __ def_val:default_value_spec { return { def_val };}
    / __ KW_COMMENT __ '\'' [^']* '\''

index_definition = 
    index_or_key __ name:ident_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ { 
        return { 
            'def_type': 'index', 
            name,
            columns
            };
        }
    / constraint_name? KW_FOREIGN_KEY __ KW_LBRACKET __ ref_columns:ident_list __ KW_RBRACKET __ KW_REFERENCES __ ref_table_name:ident_name __ KW_LBRACKET __ 
        ref_keys:ident_list __ KW_RBRACKET ref_actions:reference_action* __ {
            return {
                'def_type': 'foreign_key',
                ref_columns,
                ref_table_name,
                ref_keys,
                ref_actions: ref_actions
            };
        }
    / constraint_name? KW_PRIMARY_KEY __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type': 'primary_key',
                columns
            };
        }
    / constraint_name? KW_UNIQUE (__ index_or_key)? name:index_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type': 'unique_index',
                name,
                columns
            };
        }
    / type:spatial_or_fulltext (__ index_or_key)? name:index_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type':  type.toLowerCase() + '_index',
                name,
                columns
            };
        }

constraint_name = KW_CONSTRAINT __ name:ident_name __ { return {name} }

index_or_key =
    KW_INDEX
    / KW_KEY

key_part_list = head:key_part tail:(__ KW_COMMA __ key_part)* { return concatList(head, tail, 3); }
key_part = name:ident_name length:bracketed_length? order:(__ order)? { return { name, length, order: order ? order[1] : null }; }
bracketed_length = __ KW_LBRACKET __ length:number __ KW_RBRACKET { return length; }

order =
    KW_ASC
    / KW_DESC

spatial_or_fulltext =
    KW_SPATIAL
    / KW_FULLTEXT

index_name = __ name:ident_name { return name; }

reference_action = 
    on_delete_reference_action
    / on_update_reference_action

on_delete_reference_action =
    __ KW_ON __ KW_DELETE __ on_delete_ref:reference_option { return on_delete_ref; }

on_update_reference_action =
    __ KW_ON __ KW_UPDATE __ on_update_ref:reference_option { return on_update_ref; }

data_types = 
    type:KW_INT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_TINYINT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_VARCHAR width:data_type_width? mods:text_column_modifiers* { 
        return { 
            'type': type.toLowerCase(), 
            width, 
            ...reduceModifiersArray(mods, { char_set: null, collation: null })
        }
    }
    / type:KW_TEXT width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }
    / type:KW_CHAR width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }
    / type:KW_DECIMAL width: decimal_width? { return { type: type.toLowerCase(), ...width } }
    / type:KW_BOOLEAN { return { type: type.toLowerCase() } }
    / type:KW_BOOL { return { type: type.toLowerCase() } }
    / type:KW_TIMESTAMP { return { type: type.toLowerCase() } }
    / type:KW_DATETIME { return { type: type.toLowerCase() } }
    / type:KW_FLOAT width: decimal_width? { return { type: type.toLowerCase(), ...width } }
    / type:KW_BLOB width:data_type_width? { return { type: type.toLowerCase(), width } }
    / type:KW_ENUM __ KW_LBRACKET __ enum_list __ KW_RBRACKET mods:text_column_modifiers? { return { type: type.toLowerCase() } }
    / type:KW_BIGINT width: data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_POINT { return { type: type.toLowerCase() } }
    / type:KW_SMALLINT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_MEDIUMTEXT width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }

data_type_width =
    __ KW_LBRACKET __ width:number __ KW_RBRACKET { return width; }

text_column_modifiers =
    __ KW_CHARACTER_SET __ name:ident_name { return {char_set: name}; }
    / __ KW_COLLATE __ name:ident_name { return { collation: name}; }

decimal_width =
    __ KW_LBRACKET __ total_width:number __ KW_COMMA __ fraction_width:number KW_RBRACKET { return {width: total_width, fraction_width}; }

default_value_spec = 
    KW_DEFAULT __ value:default_value { return value; }

default_value = 
    KW_NULL { return { is_null: true, value: null }; }
    / value:([0-9]+) { return { is_null: false, value: value.join() }; }
    / KW_QUOTE_CHAR chars:[^\']* KW_QUOTE_CHAR { return {is_null: false, value: chars.join('') }; }
    / KW_CURRENT_TIMESTAMP { return { is_null: false, value: 'CURRENT TIMESTAMP', is_current_timestamp: true }; }

reference_option =
    KW_RESTRICT
    / KW_CASCADE
    / KW_SET_NULL
    / KW_NO_ACTION 
    / KW_SET_DEFAULT

column_nullability_spec = 
    KW_NOT_NULL { return false; }
    / KW_NULL { return true; }

drop_target = 
    KW_DATABASE
    / KW_TABLE
    / KW_TRIGGER
    / KW_PROCEDURE

drop_condition = 
    KW_IF __ KW_EXISTS

ident_list = head:ident_name tail:(__ KW_COMMA __ ident_name)* { return concatList(head, tail, 1); }

ident_name = 
    head:ident_start tail:ident_part* { return head + tail.join(''); }
    / '`' head:ident_start tail:ident_part* '`' { return head + tail.join(''); }

enum_list = 
    head:enum_entry tail:(__ KW_COMMA __ enum_entry)* { 
        return concatList(head, tail, 3);
    }

enum_entry = 
    KW_NULL
    / '\'\''
    / KW_QUOTE_CHAR [A-Za-z]+ KW_QUOTE_CHAR

ident_start = [A-Za-z0-9_]
ident_part  = [A-Za-z0-9$_-]

EOS = KW_SEMICOLON EOL

newline = 
    '\n' 
    / '\r' '\n'?
EOL = newline / !.

whitespace = [\t\n\r ]
__ = (whitespace / comment)*
comment = 
    block_comment
  / line_comment

block_comment = "/*" (!"*/" char)* "*/"
line_comment = "--" (!EOL char)*
char = .
// empty_line = EOL

number = digits:([0-9]+) { return parseInt(digits.join('')); }

KW_SEMICOLON = ";"
KW_EQ_OPERATOR = '=';
KW_LBRACKET = '(';
KW_RBRACKET = ')';
KW_COMMA = ',';

KW_USE = 'USE'i;
KW_DROP = 'DROP'i;
KW_CREATE = 'CREATE'i;
KW_DATABASE = 'DATABASE'i;
KW_NOT = 'NOT'i;
KW_CHARACTER = 'CHARACTER'i;
KW_SET = 'SET'i;
KW_CHARACTER_SET = KW_CHARACTER __ KW_SET;
KW_COLLATE = 'COLLATE'i;
KW_UNSIGNED = 'UNSIGNED'i;
KW_INT = 'INT'i;
KW_NULL = 'NULL'i;
KW_NOT_NULL = KW_NOT __ KW_NULL;
KW_VARCHAR = 'VARCHAR'i;
KW_TINYINT = 'TINYINT'i;
KW_KEY = 'KEY'i;
KW_FOREIGN = 'FOREIGN'i;
KW_FOREIGN_KEY = KW_FOREIGN __ KW_KEY;
KW_PRIMARY = 'PRIMARY'i;
KW_PRIMARY_KEY = KW_PRIMARY __ KW_KEY;
KW_REFERENCES = 'REFERENCES'i;
KW_ON = 'ON'i;
KW_DELETE = 'DELETE'i;
KW_CASCADE = 'CASCADE'i;
KW_TABLE = 'TABLE'i;
KW_AUTO_INCREMENT = 'AUTO_INCREMENT'i;
KW_CONSTRAINT = 'CONSTRAINT'i;
KW_CHARSET = 'CHARSET'i;
KW_TEXT = 'TEXT'i;
KW_UPDATE = 'UPDATE'i;
KW_RESTRICT = 'RESTRICT'i;
KW_SET_NULL = KW_SET __ KW_NULL;
KW_NO = 'NO'i;
KW_ACTION = 'ACTION'i;
KW_NO_ACTION = KW_NO __ KW_ACTION;
KW_DEFAULT = 'DEFAULT'i;
KW_SET_DEFAULT = KW_SET __ KW_DEFAULT;
KW_IF = 'IF'i;
KW_CHAR = 'CHAR'i;
KW_DECIMAL = 'DECIMAL'i;
KW_BOOLEAN = 'BOOLEAN'i;
KW_BOOL = 'BOOL'i;
KW_TIMESTAMP = 'TIMESTAMP'i;
KW_DATETIME = 'DATETIME'i;
KW_FLOAT = 'FLOAT'i;
KW_BLOB = 'BLOB'i;
KW_ENUM = 'ENUM'i;
KW_ALTER = 'ALTER'i;
KW_ADD = 'ADD'i;
KW_EXISTS = 'EXISTS'i;
KW_ENGINE = 'ENGINE'i;
KW_COMMENT = 'COMMENT'i;
KW_UNIQUE = 'UNIQUE'i;
KW_INDEX = 'INDEX'i;
KW_ASC = 'ASC'i;
KW_DESC = 'DESC'i;
KW_SPATIAL = 'SPATIAL'i;
KW_FULLTEXT = 'FULLTEXT'i;
KW_BIGINT = 'BIGINT'i;
KW_POINT = 'POINT'i;
KW_SMALLINT = 'SMALLINT'i;
KW_MEDIUMTEXT = 'MEDIUMTEXT'i;
KW_CURRENT_TIMESTAMP = 'CURRENT_TIMESTAMP'i;
KW_QUOTE_CHAR = '\'';
KW_TRIGGER = 'TRIGGER'i;
KW_PROCEDURE = 'PROCEDURE'i;
