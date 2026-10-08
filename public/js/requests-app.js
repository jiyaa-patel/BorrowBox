requireLogin();
const {createApp}=Vue;
createApp({
  data:()=>({role:'incoming',rows:[],search:'',error:'',busy:null,timelineRows:[],reviewTarget:null,reviewRating:5,reviewComment:''}),
  computed:{filtered(){const q=this.search.trim().toLowerCase();return this.rows.filter(x=>(`${x.item_name} ${x.borrower_name||''} ${x.owner_name||''}`).toLowerCase().includes(q))}},
  methods:{
    async load(){try{this.error='';this.rows=await api('/api/requests?role='+this.role)}catch(e){this.error=e.message}},
    async run(r,fn,msg){if(this.busy===r.id)return;this.busy=r.id;try{this.error='';await fn();if(msg)bbToast(msg);await this.load()}catch(e){this.error=e.message;await this.load()}finally{this.busy=null}},
    act(r,a){const msgs={accept:'Request accepted',reject:'Request rejected','confirm-return':'Return confirmed',return:'Marked as returned',cancel:'Request cancelled'};return this.run(r,()=>api(`/api/requests/${r.id}/${a}`,{method:'POST'}),msgs[a])},
    async code(r){if(this.busy===r.id)return;this.busy=r.id;try{this.error='';const x=await api(`/api/requests/${r.id}/handover-code`,{method:'POST'});await this.load();const fresh=this.rows.find(x=>x.id===r.id);if(fresh)fresh.shownCode=x.code;bbToast('Handover code generated')}catch(e){this.error=e.message}finally{this.busy=null}},
    confirm(r){return this.run(r,()=>api(`/api/requests/${r.id}/confirm-handover`,{method:'POST',body:JSON.stringify({code:r.inputCode||''})}),'Handover confirmed')},
    async timeline(r){try{const x=await api('/api/requests/'+r.id);this.timelineRows=x.events||[];bootstrap.Modal.getOrCreateInstance(document.querySelector('#timelineModal')).show()}catch(e){this.error=e.message}},
    review(r){this.reviewTarget=r;this.reviewRating=5;this.reviewComment='';bootstrap.Modal.getOrCreateInstance(document.querySelector('#reviewModal')).show()},
    async submitReview(){const r=this.reviewTarget;if(!r)return;await this.run(r,()=>api('/api/reviews',{method:'POST',body:JSON.stringify({request_id:r.id,rating:this.reviewRating,comment:this.reviewComment})}),'Review submitted');bootstrap.Modal.getOrCreateInstance(document.querySelector('#reviewModal')).hide()}
  },
  mounted(){this.load();this.t=setInterval(()=>this.load(),30000)},beforeUnmount(){clearInterval(this.t)}
}).mount('#app');
